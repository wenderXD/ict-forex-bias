"""
feature_analysis.py
Walk-forward backtest that captures every input dimension,
then slices win rate by each feature so we can identify which
factors actually predict killzone direction.

Cost: $0 (rule-based only)
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

from ict_analysis import analyse

INSTRUMENTS = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "AUDUSD": "AUDUSD=X",
    "NZDUSD": "NZDUSD=X",
    "USDCAD": "USDCAD=X",
    "USDCHF": "USDCHF=X",
    "USDJPY": "USDJPY=X",
    "DXY":    "DX-Y.NYB",
    "SPX500": "^GSPC",
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "USOIL":  "CL=F",
}

FOREX_SYMBOLS = {"EURUSD","GBPUSD","AUDUSD","NZDUSD","USDCAD","USDCHF","USDJPY"}

# NY local time windows
FOREX_KZ  = ( 7,  0, 10,  0)
INDEX_KZ  = ( 8, 30, 11,  0)

MIN_BARS = 60


def fetch_dw(ticker: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    t = yf.Ticker(ticker)
    daily  = t.history(period="3y", interval="1d",  auto_adjust=True)
    weekly = t.history(period="4y", interval="1wk", auto_adjust=True)
    for df in [daily, weekly]:
        df.index = pd.to_datetime(df.index, utc=True).tz_convert(None)
        df.sort_index(inplace=True)
    return (daily[["Open","High","Low","Close"]].dropna(),
            weekly[["Open","High","Low","Close"]].dropna())


def fetch_hourly(ticker: str) -> pd.DataFrame:
    t = yf.Ticker(ticker)
    df = t.history(period="2y", interval="1h", auto_adjust=True)
    df.index = pd.to_datetime(df.index, utc=True).tz_convert("America/New_York").tz_localize(None)
    df.sort_index(inplace=True)
    return df[["Open","High","Low","Close"]].dropna()


def kz_outcome(hourly: pd.DataFrame, day_ny: pd.Timestamp, symbol: str) -> bool | None:
    day_c = hourly[hourly.index.normalize() == day_ny.normalize()]
    if day_c.empty:
        return None

    h0,m0,h1,m1 = FOREX_KZ if symbol in FOREX_SYMBOLS else INDEX_KZ
    mins = day_c.index.hour * 60 + day_c.index.minute
    kz = day_c[(mins >= h0*60+m0) & (mins < h1*60+m1)]
    if len(kz) < 2:
        return None

    open_p, close_p = float(kz["Open"].iloc[0]), float(kz["Close"].iloc[-1])
    if open_p == close_p or open_p == 0:
        return None
    return close_p > open_p   # True = price rose


def dol_kind_from_label(draw: str) -> str:
    if "BSL" in draw: return "BSL"
    if "SSL" in draw: return "SSL"
    return "None"


def structure_class(label: str) -> str:
    """Simplify structure_label to a category."""
    if "HH+HL" in label: return "HH+HL"
    if "LH+LL" in label: return "LH+LL"
    if "Mixed" in label: return "Mixed"
    return "Other"


def run() -> pd.DataFrame:
    rows = []

    for symbol, ticker in INSTRUMENTS.items():
        print(f"  {symbol}...", end=" ", flush=True)
        try:
            daily_df, weekly_df = fetch_dw(ticker)
            hourly_df = fetch_hourly(ticker)
        except Exception as e:
            print(f"FAILED ({e})")
            continue

        hourly_start = hourly_df.index[0].normalize()
        cutoff_ts = pd.Timestamp(hourly_start).as_unit(daily_df.index.unit) \
                    if hasattr(daily_df.index, "unit") else pd.Timestamp(hourly_start)
        start_pos = max(MIN_BARS, daily_df.index.searchsorted(cutoff_ts))

        n = 0
        for day_pos in range(start_pos, len(daily_df) - 1):
            day = daily_df.index[day_pos]
            d_slice = daily_df.iloc[:day_pos + 1]
            w_slice = weekly_df[weekly_df.index <= day]
            if len(w_slice) < 10:
                continue

            try:
                a = analyse(symbol, d_slice, w_slice)
            except Exception:
                continue

            if a.daily_bias == "Neutral":
                continue

            day_ny = day.tz_localize("UTC").tz_convert("America/New_York").tz_localize(None).normalize()
            price_rose = kz_outcome(hourly_df, day_ny, symbol)
            if price_rose is None:
                continue

            correct = (a.daily_bias == "Bullish" and price_rose) or \
                      (a.daily_bias == "Bearish" and not price_rose)

            rows.append({
                "symbol":        symbol,
                "asset_class":   "forex" if symbol in FOREX_SYMBOLS else "non-forex",
                "date":          day.strftime("%Y-%m-%d"),
                "daily_bias":    a.daily_bias,
                "weekly_bias":   a.weekly_bias,
                "htf_aligned":   a.weekly_bias == a.daily_bias,
                "structure":     structure_class(a.structure_label),
                "premium_disc":  a.premium_discount,
                "pd_correct":    (a.daily_bias == "Bullish" and a.premium_discount == "Discount") or
                                 (a.daily_bias == "Bearish" and a.premium_discount == "Premium"),
                "has_ob":        a.nearest_ob is not None,
                "has_fvg":       a.nearest_fvg is not None,
                "dol_kind":      dol_kind_from_label(a.draw_on_liquidity),
                "has_eql":       any(l.equal for l in a.liquidity_levels),
                "confidence":    a.confidence,
                "correct":       correct,
            })
            n += 1
        print(f"{n} setups", flush=True)

    return pd.DataFrame(rows)


def slice_table(df: pd.DataFrame, col: str, label: str = None) -> None:
    label = label or col
    print(f"\n  --- {label} ---")
    print(f"  {'Bucket':<22} {'Win%':>7} {'N':>7}")
    grouped = df.groupby(col)["correct"].agg(["mean", "count"]).sort_values("mean", ascending=False)
    for bucket, row in grouped.iterrows():
        pct = row["mean"] * 100
        n   = int(row["count"])
        print(f"  {str(bucket):<22} {pct:>6.1f}% {n:>7}")


def slice_table_2d(df: pd.DataFrame, col_a: str, col_b: str, label: str = None) -> None:
    label = label or f"{col_a} x {col_b}"
    print(f"\n  --- {label} ---")
    print(f"  {'Combo':<32} {'Win%':>7} {'N':>7}")
    grouped = df.groupby([col_a, col_b])["correct"].agg(["mean", "count"]).sort_values("mean", ascending=False)
    for (a, b), row in grouped.iterrows():
        if row["count"] < 30:    # skip tiny buckets
            continue
        pct = row["mean"] * 100
        n   = int(row["count"])
        combo = f"{a} / {b}"
        print(f"  {combo:<32} {pct:>6.1f}% {n:>7}")


def summarize(df: pd.DataFrame) -> None:
    print("\n" + "=" * 60)
    print(f"  FEATURE ANALYSIS — {len(df)} setups, killzone direction")
    print("=" * 60)

    base = df["correct"].mean() * 100
    print(f"\n  Baseline win rate: {base:.1f}%")

    slice_table(df, "asset_class")
    slice_table(df, "daily_bias", "Direction")
    slice_table(df, "premium_disc", "Premium / Discount zone")
    slice_table(df, "pd_correct", "Discount+Bullish or Premium+Bearish (correct PD setup)")
    slice_table(df, "htf_aligned", "Weekly aligned with daily")
    slice_table(df, "structure", "Daily structure")
    slice_table(df, "has_ob", "Nearest OB present")
    slice_table(df, "has_fvg", "Nearest FVG present")
    slice_table(df, "has_eql", "EQH/EQL liquidity present")
    slice_table(df, "dol_kind", "Draw on Liquidity kind")

    # 2-D combos that should matter
    slice_table_2d(df, "asset_class", "pd_correct",   "Asset class x correct PD")
    slice_table_2d(df, "asset_class", "htf_aligned",  "Asset class x HTF aligned")
    slice_table_2d(df, "daily_bias", "premium_disc", "Direction x Zone")
    slice_table_2d(df, "asset_class", "structure",    "Asset class x Structure")

    # Confidence as ordered band
    df["conf_band"] = pd.cut(df["confidence"], bins=[0,3,5,7,10],
                              labels=["1-3","4-5","6-7","8-10"])
    slice_table(df, "conf_band", "Confidence band")

    out = os.path.join(os.path.dirname(__file__), "feature_analysis.csv")
    df.drop(columns=["conf_band"]).to_csv(out, index=False)
    print(f"\n  Full feature CSV -> {out}")
    print("=" * 60)


if __name__ == "__main__":
    print("Feature analysis  |  Rule-based ICT  |  $0\n")
    df = run()
    if df.empty:
        print("\nNo data collected.")
    else:
        summarize(df)
