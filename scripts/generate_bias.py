"""
generate_bias.py
Orchestrator: fetches data → Claude ICT analysis → writes JSON output.

Primary path:  Claude claude-opus-4-6 analyses raw price data directly (full ICT agent)
Fallback path: rule-based ict_analysis.py (when ANTHROPIC_API_KEY is not set)
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

from fetch_data import fetch_all
from ict_analysis import analyse as rule_based_analyse, ICTAnalysis, OrderBlock, FVG, LiquidityLevel
from claude_analyst import analyse_with_claude


OUTPUT_DIR = Path(__file__).parent.parent / "data" / "bias"

USE_AI = bool(os.environ.get("ANTHROPIC_API_KEY"))


# ---------------------------------------------------------------------------
# Numpy-safe JSON encoder
# ---------------------------------------------------------------------------

class SafeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.bool_):    return bool(obj)
        if isinstance(obj, np.integer):  return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        return super().default(obj)


# ---------------------------------------------------------------------------
# Fallback serialisation (rule-based path)
# ---------------------------------------------------------------------------

def ob_to_dict(ob: OrderBlock | None) -> dict | None:
    if ob is None:
        return None
    return {
        "timestamp": ob.timestamp.isoformat(),
        "high": round(ob.high, 6), "low": round(ob.low, 6),
        "kind": ob.kind, "mitigated": ob.mitigated,
    }

def fvg_to_dict(fvg: FVG | None) -> dict | None:
    if fvg is None:
        return None
    return {
        "timestamp": fvg.timestamp.isoformat(),
        "top": round(fvg.top, 6), "bottom": round(fvg.bottom, 6),
        "ce":  round(fvg.ce, 6),  "kind": fvg.kind, "filled": fvg.filled,
    }

def liq_to_dict(l: LiquidityLevel) -> dict:
    return {"price": round(l.price, 6), "kind": l.kind, "equal": l.equal}

def rule_analysis_to_dict(a: ICTAnalysis) -> dict:
    return {
        "symbol":            a.symbol,
        "current_price":     round(a.current_price, 6),
        "weekly_bias":       a.weekly_bias,
        "daily_bias":        a.daily_bias,
        "structure_label":   a.structure_label,
        "last_bos":          a.last_bos,
        "swing_high":        round(a.swing_high, 6),
        "swing_low":         round(a.swing_low, 6),
        "equilibrium":       round(a.equilibrium, 6),
        "premium_discount":  a.premium_discount,
        "previous_day_high": round(a.previous_day_high, 6),
        "previous_day_low":  round(a.previous_day_low, 6),
        "previous_week_high":round(a.previous_week_high, 6),
        "previous_week_low": round(a.previous_week_low, 6),
        "nearest_ob":        ob_to_dict(a.nearest_ob),
        "nearest_fvg":       fvg_to_dict(a.nearest_fvg),
        "liquidity_levels":  [liq_to_dict(l) for l in a.liquidity_levels],
        "draw_on_liquidity": a.draw_on_liquidity,
        "key_poi_label":     a.key_poi_label,
        "confidence":        a.confidence,
        "narrative":         a.narrative,
    }


# ---------------------------------------------------------------------------
# Zone-driven bias override
# ---------------------------------------------------------------------------
# Backtest finding (2y, 4209 setups, 58.7% killzone win rate, 56-62% per
# instrument): the data-proven daily bias is the premium/discount zone, not
# the structure label. Apply this regardless of whether Claude or the rule-
# based engine produced the analysis.

def apply_zone_bias_rule(instrument: dict) -> dict:
    zone = instrument.get("premium_discount")
    if zone == "Premium":
        instrument["daily_bias"] = "Bullish"
    elif zone == "Discount":
        instrument["daily_bias"] = "Bearish"
    else:
        instrument["daily_bias"] = "Neutral"
    return instrument


# ---------------------------------------------------------------------------
# Market overview (works on both paths — uses dicts)
# ---------------------------------------------------------------------------

def build_market_overview(instruments: list[dict]) -> str:
    bullish = [i["symbol"] for i in instruments if i["daily_bias"] == "Bullish"]
    bearish = [i["symbol"] for i in instruments if i["daily_bias"] == "Bearish"]
    neutral = [i["symbol"] for i in instruments if i["daily_bias"] == "Neutral"]

    dxy = next((i for i in instruments if i["symbol"] == "DXY"), None)
    dxy_note = ""
    if dxy:
        d = dxy["daily_bias"]
        dxy_note = (
            f" The US Dollar Index (DXY) is {d.lower()}, "
            f"which {'supports USD strength — risk-off tone' if d == 'Bullish' else 'suggests USD weakness — risk-on tone' if d == 'Bearish' else 'is indecisive'}."
        )

    lines = []
    if bullish: lines.append(f"Bullish: {', '.join(bullish)}")
    if bearish: lines.append(f"Bearish: {', '.join(bearish)}")
    if neutral: lines.append(f"Neutral/Ranging: {', '.join(neutral)}")
    return f"Daily market overview — {'; '.join(lines)}.{dxy_note}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_path = OUTPUT_DIR / f"{today}.json"

    mode = "Claude claude-opus-4-6 (AI agent)" if USE_AI else "Rule-based fallback (no API key)"
    print(f"=== ICT Bias Generator — {today} ===")
    print(f"    Mode: {mode}\n")

    # Step 1 — fetch market data
    print("Step 1: Fetching market data...")
    all_data = fetch_all()
    print(f"\nFetched data for {len(all_data)} instruments.\n")

    # Step 2 — analyse each instrument
    print("Step 2: Running ICT analysis...")
    results: list[dict] = []
    errors:  list[str]  = []

    for symbol, frames in all_data.items():
        daily_df  = frames.get("1d")
        weekly_df = frames.get("1wk")

        if daily_df is None or weekly_df is None:
            errors.append(f"{symbol}: missing timeframe data")
            continue

        instrument_dict = None

        # --- Primary: Claude full ICT agent ---
        if USE_AI:
            try:
                print(f"  {symbol}: asking Claude...")
                instrument_dict = analyse_with_claude(symbol, daily_df, weekly_df, today)
                print(f"  {symbol}: Claude analysis OK")
            except Exception as e:
                import traceback
                print(f"  {symbol}: Claude FAILED — {e}")
                traceback.print_exc()
                print(f"  {symbol}: falling back to rule-based")

        # --- Fallback: rule-based analysis ---
        if instrument_dict is None:
            try:
                analysis = rule_based_analyse(symbol, daily_df, weekly_df)
                instrument_dict = rule_analysis_to_dict(analysis)
            except Exception as e:
                errors.append(f"{symbol}: {e}")
                print(f"  {symbol}: ERROR – {e}")
                continue

        # Apply zone-driven bias rule (overrides whatever the source said)
        instrument_dict = apply_zone_bias_rule(instrument_dict)

        results.append(instrument_dict)
        bias    = instrument_dict.get("daily_bias", "Neutral")
        zone    = instrument_dict.get("premium_discount", "?")
        icon    = "▲" if bias == "Bullish" else "▼" if bias == "Bearish" else "◆"
        print(f"  {symbol}: {icon} {bias} | Zone: {zone}")

    if errors:
        print(f"\nWarnings ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")

    # Step 3 — write output
    print(f"\nStep 3: Writing output to {out_path} ...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "date":            today,
        "generated_at":    datetime.now(timezone.utc).isoformat(),
        "market_overview": build_market_overview(results),
        "instruments":     results,
    }

    for path in [out_path, OUTPUT_DIR / "latest.json"]:
        with open(path, "w") as f:
            json.dump(output, f, indent=2, cls=SafeEncoder)

    # Update date index
    all_files = sorted(OUTPUT_DIR.glob("????-??-??.json"), reverse=True)
    with open(OUTPUT_DIR / "index.json", "w") as f:
        json.dump([fp.stem for fp in all_files], f, indent=2)

    print(f"Done. {len(results)} instruments analysed.")
    print("index.json updated.")


if __name__ == "__main__":
    main()
