"""
backtest_killzone.py
Tests whether the daily ICT bias matches price direction
during two session windows (all times NEW YORK / Eastern):

  Forex pairs:  07:00 - 10:00 AM NY  (London / pre-NY overlap)
  Indices/Comm: 08:30 - 11:00 AM NY  (NY open killzone)

Extended window adds 2 hours after each window closes.
Hourly data is converted to America/New_York so DST is handled correctly.

Cost: $0 (rule-based only, no API calls)
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

# Killzone windows — NEW YORK LOCAL TIME (DST handled via tz_convert)
FOREX_SYMBOLS = {"EURUSD","GBPUSD","AUDUSD","NZDUSD","USDCAD","USDCHF","USDJPY"}
INDEX_SYMBOLS  = {"DXY","SPX500","XAUUSD","XAGUSD","USOIL"}

# (start_hour, start_min, end_hour, end_min)
FOREX_KZ  = ( 7,  0, 10,  0)   # 07:00 - 10:00 NY
FOREX_EXT = ( 7,  0, 12,  0)   # extended to 12:00 NY

INDEX_KZ  = ( 8, 30, 11,  0)   # 08:30 - 11:00 NY
INDEX_EXT = ( 8, 30, 13,  0)   # extended to 13:00 NY

MIN_BARS = 60


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_daily_weekly(ticker: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    t = yf.Ticker(ticker)
    daily  = t.history(period="3y",  interval="1d",  auto_adjust=True)
    weekly = t.history(period="4y",  interval="1wk", auto_adjust=True)
    for df in [daily, weekly]:
        df.index = pd.to_datetime(df.index, utc=True).tz_convert(None)
        df.sort_index(inplace=True)
    return (
        daily[["Open","High","Low","Close"]].dropna(),
        weekly[["Open","High","Low","Close"]].dropna(),
    )


def fetch_hourly(ticker: str) -> pd.DataFrame:
    t = yf.Ticker(ticker)
    df = t.history(period="2y", interval="1h", auto_adjust=True)
    # Convert to NY local time (handles EST/EDT automatically), then strip tz
    df.index = pd.to_datetime(df.index, utc=True).tz_convert("America/New_York").tz_localize(None)
    df.sort_index(inplace=True)
    return df[["Open","High","Low","Close"]].dropna()


# ---------------------------------------------------------------------------
# Killzone outcome for a single day
# ---------------------------------------------------------------------------

def _window(day_candles: pd.DataFrame, h0: int, m0: int, h1: int, m1: int) -> pd.DataFrame:
    """Filter candles to [h0:m0, h1:m1) in whatever timezone the index is in."""
    idx = day_candles.index
    start_mins = idx.hour * 60 + idx.minute
    return day_candles[(start_mins >= h0 * 60 + m0) & (start_mins < h1 * 60 + m1)]


def killzone_outcome(hourly_df: pd.DataFrame, day: pd.Timestamp, symbol: str) -> dict | None:
    """
    Extract killzone candles for `day` (NY local date) using the window for `symbol`.
    Returns None if there aren't enough candles.
    """
    # hourly_df index is in NY local time — match by NY calendar date
    day_candles = hourly_df[hourly_df.index.normalize() == day.normalize()]
    if day_candles.empty:
        return None

    if symbol in FOREX_SYMBOLS:
        kz  = _window(day_candles, *FOREX_KZ)
        ext = _window(day_candles, *FOREX_EXT)
    else:
        kz  = _window(day_candles, *INDEX_KZ)
        ext = _window(day_candles, *INDEX_EXT)

    if len(kz) < 2:
        return None

    kz_open   = float(kz["Open"].iloc[0])
    kz_close  = float(kz["Close"].iloc[-1])
    ext_close = float(ext["Close"].iloc[-1]) if len(ext) >= 2 else kz_close

    if kz_open == 0:
        return None

    return {
        "kz_open":   kz_open,
        "kz_close":  kz_close,
        "ext_close": ext_close,
        "kz_move":   kz_close  - kz_open,
        "ext_move":  ext_close - kz_open,
        "kz_pct":    (kz_close  - kz_open) / kz_open * 100,
        "ext_pct":   (ext_close - kz_open) / kz_open * 100,
    }


# ---------------------------------------------------------------------------
# Main backtest loop
# ---------------------------------------------------------------------------

def run_backtest() -> list[dict]:
    results = []

    for symbol, ticker in INSTRUMENTS.items():
        print(f"\n{symbol}: fetching...", end=" ", flush=True)
        try:
            daily_df, weekly_df = fetch_daily_weekly(ticker)
            hourly_df = fetch_hourly(ticker)
        except Exception as e:
            print(f"FAILED ({e})")
            continue

        # Only test days where we have hourly data
        hourly_start = hourly_df.index[0].normalize()
        cutoff_ts    = pd.Timestamp(hourly_start).as_unit(daily_df.index.unit) \
                       if hasattr(daily_df.index, "unit") else pd.Timestamp(hourly_start)

        start_pos = max(
            MIN_BARS,
            daily_df.index.searchsorted(cutoff_ts),
        )

        kz_correct = kz_wrong = ext_correct = ext_wrong = neutral = 0

        for day_pos in range(start_pos, len(daily_df) - 1):
            day = daily_df.index[day_pos]

            # Rule-based analysis on data up to this day
            d_slice = daily_df.iloc[:day_pos + 1]
            w_slice = weekly_df[weekly_df.index <= day]
            if len(w_slice) < 10:
                continue

            try:
                result = analyse(symbol, d_slice, w_slice)
            except Exception:
                continue

            bias = result.daily_bias
            if bias == "Neutral":
                neutral += 1
                continue

            # Convert UTC daily date to NY local date for hourly lookup
            day_ny = day.tz_localize("UTC").tz_convert("America/New_York").tz_localize(None).normalize()
            kz = killzone_outcome(hourly_df, day_ny, symbol)
            if kz is None:
                neutral += 1
                continue

            # Killzone window (12-17 UTC)
            kz_rose = kz["kz_move"] > 0
            kz_ok   = (bias == "Bullish" and kz_rose) or (bias == "Bearish" and not kz_rose)
            if kz["kz_move"] == 0:
                neutral += 1
                continue

            if kz_ok:
                kz_correct += 1
            else:
                kz_wrong += 1

            # Extended window (12-19 UTC)
            ext_rose = kz["ext_move"] > 0
            ext_ok   = (bias == "Bullish" and ext_rose) or (bias == "Bearish" and not ext_rose)

            if ext_ok:
                ext_correct += 1
            else:
                ext_wrong += 1

            results.append({
                "symbol":      symbol,
                "date":        day.strftime("%Y-%m-%d"),
                "bias":        bias,
                "confidence":  result.confidence,
                "kz_correct":  kz_ok,
                "ext_correct": ext_ok,
                "kz_pct":      round(kz["kz_pct"], 4),
                "ext_pct":     round(kz["ext_pct"], 4),
            })

        kz_total  = kz_correct  + kz_wrong
        ext_total = ext_correct + ext_wrong
        kz_pct    = kz_correct  / kz_total  * 100 if kz_total  else 0
        ext_pct   = ext_correct / ext_total * 100 if ext_total else 0
        print(
            f"KZ {kz_correct}/{kz_total} ({kz_pct:.1f}%)  "
            f"| EXT {ext_correct}/{ext_total} ({ext_pct:.1f}%)  "
            f"| {neutral} skipped",
            flush=True,
        )

    return results


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def print_summary(results: list[dict]) -> None:
    if not results:
        print("No results.")
        return

    df = pd.DataFrame(results)

    print("\n" + "=" * 70)
    print(f"  KILLZONE BACKTEST  (all times New York / Eastern)")
    print(f"  Forex: 07:00-10:00 AM NY (+2h)  |  Indices: 08:30-11:00 AM NY (+2h)")
    print("=" * 70)

    hdr = f"  {'Symbol':<10} {'KZ Acc':>8} {'EXT Acc':>9} {'Bull KZ':>9} {'Bear KZ':>9} {'N':>6}"
    print(f"\n{hdr}")
    print("  " + "-" * 57)

    for symbol in INSTRUMENTS:
        sub = df[df["symbol"] == symbol]
        if sub.empty:
            continue
        n      = len(sub)
        kz_acc = sub["kz_correct"].mean()  * 100
        ex_acc = sub["ext_correct"].mean() * 100

        bull = sub[sub["bias"] == "Bullish"]
        bear = sub[sub["bias"] == "Bearish"]
        bk = bull["kz_correct"].mean() * 100 if len(bull) else 0
        rk = bear["kz_correct"].mean() * 100 if len(bear) else 0

        tag = "  <--" if symbol in ("DXY", "SPX500") else ""
        print(f"  {symbol:<10} {kz_acc:>7.1f}%  {ex_acc:>8.1f}%  {bk:>8.1f}%  {rk:>8.1f}%  {n:>5}{tag}")

    print("  " + "-" * 57)
    kz_all  = df["kz_correct"].mean()  * 100
    ext_all = df["ext_correct"].mean() * 100
    print(f"  {'OVERALL':<10} {kz_all:>7.1f}%  {ext_all:>8.1f}%  {'':>9}  {'':>9}  {len(df):>5}")

    # By confidence
    print("\n  KZ accuracy by confidence band:")
    for lo, hi, label in [(7,10,"High   (7-10)"),(5,6,"Moderate (5-6)"),(1,4,"Low    (1-4)")]:
        sub = df[(df["confidence"] >= lo) & (df["confidence"] <= hi)]
        if sub.empty:
            continue
        pct = sub["kz_correct"].mean() * 100
        print(f"    {label}: {int(sub['kz_correct'].sum())}/{len(sub)}  ({pct:.1f}%)")

    # Save
    out = os.path.join(os.path.dirname(__file__), "backtest_killzone_results.csv")
    df.to_csv(out, index=False)
    print(f"\n  Results saved -> {out}")
    print("=" * 70)


if __name__ == "__main__":
    print("Killzone backtest  |  Rule-based ICT  |  $0\n")
    print(f"  Forex   killzone:  07:00 - 10:00 AM NY  (extended to 12:00 NY)")
    print(f"  Indices killzone:  08:30 - 11:00 AM NY  (extended to 13:00 NY)\n")
    results = run_backtest()
    print_summary(results)
