"""
backtest_dol.py
Tests the actual ICT thesis: did price reach the predicted
draw on liquidity (DOL) during the killzone window?

Outcome metric:
  Bullish bias  -> killzone HIGH  >= DOL price (BSL above)
  Bearish bias  -> killzone LOW   <= DOL price (SSL below)

Both tested with the new zone-driven bias rule.
Cost: $0
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import yfinance as yf
import pandas as pd

from ict_analysis import (
    detect_swings, classify_structure, premium_discount,
    detect_liquidity, find_draw, zone_to_bias,
)

INSTRUMENTS = {
    "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "AUDUSD": "AUDUSD=X",
    "NZDUSD": "NZDUSD=X", "USDCAD": "USDCAD=X", "USDCHF": "USDCHF=X",
    "USDJPY": "USDJPY=X", "DXY": "DX-Y.NYB",    "SPX500": "^GSPC",
    "XAUUSD": "GC=F",     "XAGUSD": "SI=F",     "USOIL":  "CL=F",
}
FOREX = {"EURUSD","GBPUSD","AUDUSD","NZDUSD","USDCAD","USDCHF","USDJPY"}

FOREX_KZ = ( 7,  0, 10,  0)   # NY local time
INDEX_KZ = ( 8, 30, 11,  0)
MIN_BARS = 60


def fetch_dw(t: str):
    tk = yf.Ticker(t)
    d = tk.history(period="3y", interval="1d",  auto_adjust=True)
    w = tk.history(period="4y", interval="1wk", auto_adjust=True)
    for x in [d, w]:
        x.index = pd.to_datetime(x.index, utc=True).tz_convert(None)
        x.sort_index(inplace=True)
    return d[["Open","High","Low","Close"]].dropna(), w[["Open","High","Low","Close"]].dropna()


def fetch_h(t: str):
    df = yf.Ticker(t).history(period="2y", interval="1h", auto_adjust=True)
    df.index = pd.to_datetime(df.index, utc=True).tz_convert("America/New_York").tz_localize(None)
    df.sort_index(inplace=True)
    return df[["Open","High","Low","Close"]].dropna()


def kz_window(hourly: pd.DataFrame, day_ny: pd.Timestamp, symbol: str) -> pd.DataFrame:
    day_c = hourly[hourly.index.normalize() == day_ny.normalize()]
    if day_c.empty:
        return day_c
    h0,m0,h1,m1 = FOREX_KZ if symbol in FOREX else INDEX_KZ
    mins = day_c.index.hour * 60 + day_c.index.minute
    return day_c[(mins >= h0*60+m0) & (mins < h1*60+m1)]


def parse_dol_price(draw: str) -> float | None:
    """Parse 'BSL at 1.16193' or 'SSL (EQL) at 0.78377' -> 1.16193 / 0.78377"""
    if not draw or "at" not in draw:
        return None
    try:
        return float(draw.rsplit("at", 1)[1].strip())
    except (ValueError, IndexError):
        return None


def run() -> pd.DataFrame:
    rows = []
    for symbol, ticker in INSTRUMENTS.items():
        print(f"  {symbol}...", end=" ", flush=True)
        try:
            d_full, w_full = fetch_dw(ticker)
            h_full = fetch_h(ticker)
        except Exception as e:
            print(f"FAILED ({e})")
            continue

        h_start = h_full.index[0].normalize()
        cutoff_ts = pd.Timestamp(h_start).as_unit(d_full.index.unit) \
                    if hasattr(d_full.index, "unit") else pd.Timestamp(h_start)
        start = max(MIN_BARS, d_full.index.searchsorted(cutoff_ts))

        n = 0
        for i in range(start, len(d_full) - 1):
            day = d_full.index[i]
            d = d_full.iloc[:i+1]
            w = w_full[w_full.index <= day]
            if len(w) < 10 or len(d) < 20:
                continue

            current_price = float(d["Close"].iloc[-1])

            # Build the inputs to find_draw with the new zone rule
            d_swings = detect_swings(d, left=3, right=3)
            d_highs = [s for s in d_swings if s.kind == "high"]
            d_lows  = [s for s in d_swings if s.kind == "low"]
            if not d_highs or not d_lows:
                continue
            sh = d_highs[-1].price
            sl = d_lows[-1].price
            zone, _ = premium_discount(current_price, sh, sl)
            bias = zone_to_bias(zone)
            if bias == "Neutral":
                continue

            liquidity = detect_liquidity(d_swings)
            draw = find_draw(liquidity, bias, current_price)
            dol_price = parse_dol_price(draw)
            if dol_price is None:
                continue

            day_ny = day.tz_localize("UTC").tz_convert("America/New_York").tz_localize(None).normalize()
            kz = kz_window(h_full, day_ny, symbol)
            if len(kz) < 2:
                continue

            kz_high = float(kz["High"].max())
            kz_low  = float(kz["Low"].min())
            kz_open = float(kz["Open"].iloc[0])
            kz_close = float(kz["Close"].iloc[-1])

            if bias == "Bullish":
                hit = kz_high >= dol_price
                target_dist = (dol_price - kz_open) / kz_open * 100
            else:
                hit = kz_low  <= dol_price
                target_dist = (kz_open - dol_price) / kz_open * 100

            # Direction-correct (open vs close) for comparison
            dir_correct = (bias == "Bullish" and kz_close > kz_open) or \
                          (bias == "Bearish" and kz_close < kz_open)

            rows.append({
                "symbol":      symbol,
                "asset_class": "forex" if symbol in FOREX else "non-forex",
                "date":        day.strftime("%Y-%m-%d"),
                "bias":        bias,
                "zone":        zone,
                "current":     round(current_price, 6),
                "dol":         round(dol_price, 6),
                "dist_pct":    round(target_dist, 4),
                "kz_high":     round(kz_high, 6),
                "kz_low":      round(kz_low, 6),
                "dol_hit":     hit,
                "dir_correct": dir_correct,
            })
            n += 1
        print(f"{n} setups", flush=True)
    return pd.DataFrame(rows)


def summarize(df: pd.DataFrame) -> None:
    if df.empty:
        print("\nNo data.")
        return

    print("\n" + "=" * 60)
    print("  DOL HIT TEST — did price reach the predicted target?")
    print("=" * 60)

    n         = len(df)
    hit_pct   = df["dol_hit"].mean() * 100
    dir_pct   = df["dir_correct"].mean() * 100
    print(f"\n  Total: {n} setups")
    print(f"  DOL  hit rate (price reached target): {hit_pct:.1f}%")
    print(f"  Dir  match rate (open->close):        {dir_pct:.1f}%   (zone rule baseline)")

    # Per-instrument
    print(f"\n  {'Symbol':<10} {'N':>5} {'DOL Hit%':>9} {'Dir Match%':>11} {'Avg dist%':>11}")
    for sym in INSTRUMENTS:
        sub = df[df["symbol"] == sym]
        if sub.empty: continue
        print(f"  {sym:<10} {len(sub):>5} "
              f"{sub['dol_hit'].mean()*100:>8.1f}% "
              f"{sub['dir_correct'].mean()*100:>10.1f}% "
              f"{sub['dist_pct'].mean():>10.3f}%")

    # By zone
    print(f"\n  By zone:")
    for z in ["Premium", "Discount"]:
        sub = df[df["zone"] == z]
        print(f"  {z:<10}  N={len(sub):>4}  DOL hit={sub['dol_hit'].mean()*100:5.1f}%  "
              f"Dir={sub['dir_correct'].mean()*100:5.1f}%")

    # Distance buckets
    print(f"\n  By target distance (smaller = closer DOL = easier hit):")
    df = df.copy()
    df["dist_bucket"] = pd.cut(df["dist_pct"],
        bins=[-100, 0.05, 0.15, 0.30, 0.60, 100],
        labels=["<0.05%", "0.05-0.15%", "0.15-0.30%", "0.30-0.60%", ">0.60%"])
    for b, sub in df.groupby("dist_bucket", observed=True):
        if len(sub) < 30: continue
        print(f"  {str(b):<14}  N={len(sub):>4}  DOL hit={sub['dol_hit'].mean()*100:5.1f}%")

    out = os.path.join(os.path.dirname(__file__), "backtest_dol.csv")
    df.drop(columns=["dist_bucket"]).to_csv(out, index=False)
    print(f"\n  Full CSV -> {out}")
    print("=" * 60)


if __name__ == "__main__":
    print("DOL backtest  |  zone-driven bias  |  $0\n")
    df = run()
    summarize(df)
