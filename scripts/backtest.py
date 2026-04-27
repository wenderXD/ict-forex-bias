"""
backtest.py
Walk-forward backtest of the rule-based ICT analysis engine.

For every trading day in the past 2 years, slices data to what was
available up to that day (no lookahead), runs the rule-based analysis,
then checks if the predicted direction matched the next day's actual close.

Cost: $0  (no API calls)
"""

import sys
import os
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

LOOKBACK_YEARS = 2
MIN_BARS = 60   # warm-up bars before we start recording results


def fetch(ticker: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    t = yf.Ticker(ticker)
    daily  = t.history(period=f"{LOOKBACK_YEARS + 1}y", interval="1d",  auto_adjust=True)
    weekly = t.history(period=f"{LOOKBACK_YEARS + 2}y", interval="1wk", auto_adjust=True)
    for df in [daily, weekly]:
        df.index = pd.to_datetime(df.index, utc=True).tz_convert(None)
        df.sort_index(inplace=True)
    return (
        daily[["Open", "High", "Low", "Close"]].dropna(),
        weekly[["Open", "High", "Low", "Close"]].dropna(),
    )


def run_backtest() -> list[dict]:
    cutoff = datetime.now() - timedelta(days=LOOKBACK_YEARS * 365)
    all_results = []

    for symbol, ticker in INSTRUMENTS.items():
        print(f"\n{symbol}: fetching...", end=" ", flush=True)
        try:
            daily_df, weekly_df = fetch(ticker)
        except Exception as e:
            print(f"FAILED ({e})")
            continue

        # Find the starting position within the backtest window
        cutoff_ts = pd.Timestamp(cutoff).as_unit(daily_df.index.unit) if hasattr(daily_df.index, "unit") else pd.Timestamp(cutoff)
        start_pos = max(
            MIN_BARS,
            daily_df.index.searchsorted(cutoff_ts),
        )

        correct = wrong = neutral = errors = 0

        for day_pos in range(start_pos, len(daily_df) - 1):
            day = daily_df.index[day_pos]

            d_slice = daily_df.iloc[:day_pos + 1]
            w_slice = weekly_df[weekly_df.index <= day]
            if len(w_slice) < 10:
                continue

            try:
                result = analyse(symbol, d_slice, w_slice)
            except Exception:
                errors += 1
                continue

            bias = result.daily_bias
            if bias == "Neutral":
                neutral += 1
                continue

            today_close = float(daily_df["Close"].iloc[day_pos])
            next_close  = float(daily_df["Close"].iloc[day_pos + 1])
            if today_close == next_close:
                neutral += 1
                continue

            price_rose = next_close > today_close
            is_correct = (
                (bias == "Bullish" and price_rose) or
                (bias == "Bearish" and not price_rose)
            )

            all_results.append({
                "symbol":     symbol,
                "date":       day.strftime("%Y-%m-%d"),
                "bias":       bias,
                "confidence": result.confidence,
                "correct":    is_correct,
            })

            if is_correct:
                correct += 1
            else:
                wrong += 1

        total = correct + wrong
        pct   = correct / total * 100 if total else 0
        print(
            f"{total} calls — {correct} correct ({pct:.1f}%) "
            f"| {neutral} neutral skipped"
            + (f" | {errors} errors" if errors else ""),
            flush=True,
        )

    return all_results


def print_summary(results: list[dict]) -> None:
    if not results:
        print("No results to summarise.")
        return

    df = pd.DataFrame(results)

    print("\n" + "=" * 62)
    print(f"  BACKTEST - Rule-based ICT  |  {LOOKBACK_YEARS}-year walk-forward")
    print("=" * 62)

    # Per-instrument table
    print(f"\n  {'Symbol':<10} {'Correct':>8} {'Total':>7} {'Acc%':>7}  {'Bull%':>7}  {'Bear%':>7}")
    print("  " + "-" * 52)

    for symbol in INSTRUMENTS:
        sub = df[df["symbol"] == symbol]
        if sub.empty:
            continue
        c   = int(sub["correct"].sum())
        n   = len(sub)
        pct = c / n * 100

        bull = sub[sub["bias"] == "Bullish"]
        bear = sub[sub["bias"] == "Bearish"]
        bp = bull["correct"].sum() / len(bull) * 100 if len(bull) else 0
        rp = bear["correct"].sum() / len(bear) * 100 if len(bear) else 0

        flag = "  <--" if symbol in ("DXY", "SPX500") else ""
        print(f"  {symbol:<10} {c:>8} {n:>7} {pct:>6.1f}%  {bp:>6.1f}%  {rp:>6.1f}%{flag}")

    print("  " + "-" * 52)
    total_c = int(df["correct"].sum())
    total_n = len(df)
    print(f"  {'OVERALL':<10} {total_c:>8} {total_n:>7} {total_c/total_n*100:>6.1f}%")

    # By confidence
    print("\n  Accuracy by confidence band:")
    for lo, hi, label in [(7, 10, "High   (7-10)"), (5, 6, "Moderate (5-6)"), (1, 4, "Low    (1-4)")]:
        sub = df[(df["confidence"] >= lo) & (df["confidence"] <= hi)]
        if sub.empty:
            continue
        c = int(sub["correct"].sum())
        n = len(sub)
        print(f"    {label}: {c}/{n}  ({c/n*100:.1f}%)")

    # Save CSV
    out = os.path.join(os.path.dirname(__file__), "backtest_results.csv")
    df.to_csv(out, index=False)
    print(f"\n  Full results -> {out}")
    print("=" * 62)


if __name__ == "__main__":
    print(f"Rule-based ICT backtest — {LOOKBACK_YEARS} years, 12 instruments, $0\n")
    results = run_backtest()
    print_summary(results)
