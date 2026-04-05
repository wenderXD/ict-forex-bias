"""
generate_bias.py
Orchestrator: fetches data → runs ICT analysis → writes JSON output.
Run daily via GitHub Actions.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import numpy as np


class SafeEncoder(json.JSONEncoder):
    """Handles numpy scalar types that Python 3.14 won't auto-convert."""
    def default(self, obj):
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        return super().default(obj)

from fetch_data import fetch_all
from ict_analysis import analyse, ICTAnalysis, OrderBlock, FVG, LiquidityLevel
from ai_narrative import generate_ai_narrative


OUTPUT_DIR = Path(__file__).parent.parent / "data" / "bias"


# ---------------------------------------------------------------------------
# Serialisation helpers
# ---------------------------------------------------------------------------

def ob_to_dict(ob: OrderBlock | None) -> dict | None:
    if ob is None:
        return None
    return {
        "timestamp": ob.timestamp.isoformat(),
        "high": round(ob.high, 6),
        "low":  round(ob.low,  6),
        "kind": ob.kind,
        "mitigated": ob.mitigated,
    }


def fvg_to_dict(fvg: FVG | None) -> dict | None:
    if fvg is None:
        return None
    return {
        "timestamp": fvg.timestamp.isoformat(),
        "top":    round(fvg.top,    6),
        "bottom": round(fvg.bottom, 6),
        "ce":     round(fvg.ce,     6),
        "kind":   fvg.kind,
        "filled": fvg.filled,
    }


def liq_to_dict(l: LiquidityLevel) -> dict:
    return {
        "price": round(l.price, 6),
        "kind":  l.kind,
        "equal": l.equal,
    }


def analysis_to_dict(a: ICTAnalysis) -> dict:
    return {
        "symbol":           a.symbol,
        "current_price":    round(a.current_price, 6),
        "weekly_bias":      a.weekly_bias,
        "daily_bias":       a.daily_bias,
        "structure_label":  a.structure_label,
        "last_bos":         a.last_bos,
        "swing_high":       round(a.swing_high, 6),
        "swing_low":        round(a.swing_low,  6),
        "equilibrium":      round(a.equilibrium, 6),
        "premium_discount": a.premium_discount,
        "previous_day_high": round(a.previous_day_high, 6),
        "previous_day_low":  round(a.previous_day_low,  6),
        "previous_week_high": round(a.previous_week_high, 6),
        "previous_week_low":  round(a.previous_week_low,  6),
        "nearest_ob":        ob_to_dict(a.nearest_ob),
        "nearest_fvg":       fvg_to_dict(a.nearest_fvg),
        "liquidity_levels":  [liq_to_dict(l) for l in a.liquidity_levels],
        "draw_on_liquidity": a.draw_on_liquidity,
        "key_poi_label":     a.key_poi_label,
        "confidence":        a.confidence,
        "narrative":         a.narrative,
    }


# ---------------------------------------------------------------------------
# Market overview
# ---------------------------------------------------------------------------

def build_market_overview(analyses: list[ICTAnalysis]) -> str:
    bullish = [a.symbol for a in analyses if a.daily_bias == "Bullish"]
    bearish = [a.symbol for a in analyses if a.daily_bias == "Bearish"]
    neutral = [a.symbol for a in analyses if a.daily_bias == "Neutral"]

    # DXY context
    dxy = next((a for a in analyses if a.symbol == "DXY"), None)
    dxy_note = ""
    if dxy:
        dxy_note = (
            f" The US Dollar Index (DXY) is {dxy.daily_bias.lower()}, "
            f"which {'supports USD strength — risk-off tone' if dxy.daily_bias == 'Bullish' else 'suggests USD weakness — risk-on tone' if dxy.daily_bias == 'Bearish' else 'is indecisive'}."
        )

    lines = []
    if bullish:
        lines.append(f"Bullish: {', '.join(bullish)}")
    if bearish:
        lines.append(f"Bearish: {', '.join(bearish)}")
    if neutral:
        lines.append(f"Neutral/Ranging: {', '.join(neutral)}")

    return f"Daily market overview — {'; '.join(lines)}.{dxy_note}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_path = OUTPUT_DIR / f"{today}.json"

    print(f"=== ICT Bias Generator — {today} ===\n")

    # Fetch all market data
    print("Step 1: Fetching market data...")
    all_data = fetch_all()
    print(f"\nFetched data for {len(all_data)} instruments.\n")

    # Run ICT analysis
    print("Step 2: Running ICT analysis...")
    results: list[ICTAnalysis] = []
    errors: list[str] = []

    for symbol, frames in all_data.items():
        daily_df  = frames.get("1d")
        weekly_df = frames.get("1wk")

        if daily_df is None or weekly_df is None:
            errors.append(f"{symbol}: missing timeframe data")
            continue

        try:
            analysis = analyse(symbol, daily_df, weekly_df)
            # Replace rule-based narrative with Claude AI narrative
            print(f"    Generating AI narrative for {symbol}...")
            analysis.narrative = generate_ai_narrative(analysis, today)
            results.append(analysis)
            bias_icon = "▲" if analysis.daily_bias == "Bullish" else "▼" if analysis.daily_bias == "Bearish" else "◆"
            print(f"  {symbol}: {bias_icon} {analysis.daily_bias} | Confidence: {analysis.confidence}/10")
        except Exception as e:
            errors.append(f"{symbol}: {e}")
            print(f"  {symbol}: ERROR – {e}")

    if errors:
        print(f"\nWarnings ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")

    # Build output JSON
    print(f"\nStep 3: Writing output to {out_path} ...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    overview = build_market_overview(results)
    output = {
        "date":             today,
        "generated_at":     datetime.now(timezone.utc).isoformat(),
        "market_overview":  overview,
        "instruments":      [analysis_to_dict(a) for a in results],
    }

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2, cls=SafeEncoder)

    # Also write latest.json for the website to read easily
    latest_path = OUTPUT_DIR / "latest.json"
    with open(latest_path, "w") as f:
        json.dump(output, f, indent=2, cls=SafeEncoder)

    print(f"Done. {len(results)} instruments analysed.")
    if errors:
        print(f"{len(errors)} instruments had errors (see above).")

    # Write an index of all available dates
    all_files = sorted(OUTPUT_DIR.glob("????-??-??.json"), reverse=True)
    date_index = [f.stem for f in all_files]
    with open(OUTPUT_DIR / "index.json", "w") as f:
        json.dump(date_index, f, indent=2)

    print("index.json updated.")


if __name__ == "__main__":
    main()
