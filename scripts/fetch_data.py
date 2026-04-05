"""
fetch_data.py
Downloads OHLCV data for all instruments using yfinance.
Returns a dict of DataFrames keyed by symbol and timeframe.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

# Instrument map: our label → yfinance ticker
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

# How many bars of history we need per timeframe
PERIODS = {
    "1d":  "1y",    # Daily bars – 1 year
    "1wk": "5y",    # Weekly bars – 5 years
    "1h":  "60d",   # Hourly bars – 60 days (yfinance limit)
}


def fetch_ohlcv(ticker_symbol: str, interval: str, period: str) -> pd.DataFrame:
    """Download OHLCV data and return a clean DataFrame."""
    ticker = yf.Ticker(ticker_symbol)
    df = ticker.history(period=period, interval=interval, auto_adjust=True)
    if df.empty:
        return pd.DataFrame()
    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.index = pd.to_datetime(df.index, utc=True).tz_convert(None)
    df.sort_index(inplace=True)
    df.dropna(inplace=True)
    return df


def fetch_all() -> dict:
    """
    Returns:
        {
          "EURUSD": {"1d": DataFrame, "1wk": DataFrame, "1h": DataFrame},
          "GBPUSD": {...},
          ...
        }
    """
    all_data = {}
    for symbol, ticker in INSTRUMENTS.items():
        print(f"  Fetching {symbol} ({ticker})...")
        frames = {}
        for interval, period in PERIODS.items():
            try:
                df = fetch_ohlcv(ticker, interval, period)
                if not df.empty:
                    frames[interval] = df
                    print(f"    {interval}: {len(df)} bars")
                else:
                    print(f"    {interval}: no data returned")
            except Exception as e:
                print(f"    {interval}: error – {e}")
        if frames:
            all_data[symbol] = frames
    return all_data


if __name__ == "__main__":
    print("Fetching market data...")
    data = fetch_all()
    print(f"\nDone. {len(data)} instruments loaded.")
