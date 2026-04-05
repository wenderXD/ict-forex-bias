"""
claude_analyst.py
Sends raw OHLCV price data to Claude claude-opus-4-6 and asks it to perform
a full ICT analysis — structure, OBs, FVGs, liquidity, bias, narrative.
Returns a dict matching the InstrumentBias JSON schema used by the website.
"""

import json
import os
import anthropic
import pandas as pd
from datetime import datetime, timezone


SYSTEM_PROMPT = """\
You are a professional forex and financial markets analyst with deep expertise in \
ICT (Inner Circle Trader) methodology and Smart Money Concepts (SMC).

You will receive raw OHLCV (Open, High, Low, Close, Volume) candlestick data for a \
financial instrument — weekly bars for higher timeframe context and daily bars for \
the current bias.

Your job is to perform a complete ICT analysis and return the result as a single \
valid JSON object. No prose before or after — only the JSON object.

ICT concepts to apply:
- Market structure: identify swing highs/lows, HH/HL (bullish) or LH/LL (bearish), BOS/ChoCH
- Liquidity: identify buy-side (BSL) and sell-side (SSL) pools above swing highs / below swing lows
- Equal highs (EQH) / equal lows (EQL): clustered swing points within 0.15% of each other
- Order Blocks: last opposing candle before a significant impulse that broke structure
- Fair Value Gaps (FVG): 3-candle imbalances (gap between candle[i-1].high and candle[i+1].low for bullish, or candle[i-1].low and candle[i+1].high for bearish)
- Premium / Discount: price position relative to the 50% equilibrium of the most recent dealing range
- Draw on liquidity: the nearest significant unmitigated pool price is likely targeting
- Power of 3: Accumulation → Manipulation → Distribution context

Return ONLY this JSON structure (fill every field, no nulls unless truly absent):

{
  "weekly_bias": "Bullish" | "Bearish" | "Neutral",
  "daily_bias": "Bullish" | "Bearish" | "Neutral",
  "confidence": <integer 1-10>,
  "structure_label": "<short description of current market structure>",
  "last_bos": "<description of most recent BOS or ChoCH>",
  "swing_high": <float — most recent significant swing high>,
  "swing_low": <float — most recent significant swing low>,
  "equilibrium": <float — 50% of current dealing range>,
  "premium_discount": "Premium" | "Discount" | "Equilibrium",
  "previous_day_high": <float>,
  "previous_day_low": <float>,
  "previous_week_high": <float>,
  "previous_week_low": <float>,
  "nearest_ob": {
    "high": <float>,
    "low": <float>,
    "kind": "bullish" | "bearish",
    "mitigated": false
  } | null,
  "nearest_fvg": {
    "top": <float>,
    "bottom": <float>,
    "ce": <float>,
    "kind": "bullish" | "bearish",
    "filled": false
  } | null,
  "liquidity_levels": [
    {"price": <float>, "kind": "BSL" | "SSL", "equal": true | false}
  ],
  "draw_on_liquidity": "<description of the draw — e.g. BSL at 1.1050 (EQH)>",
  "key_poi_label": "<short label for the key POI>",
  "narrative": "<3-5 paragraph professional ICT analysis narrative>"
}

Confidence scoring guide:
10 = All timeframes aligned + price at perfect POI + clear liquidity draw
7-9 = Strong confluence across 2+ factors
5-6 = Moderate setup, some conflicting signals
3-4 = Weak or unclear setup
1-2 = Highly uncertain, ranging/choppy price action
"""


def _format_candles(df: pd.DataFrame, n: int) -> str:
    """Return the last n candles as compact CSV."""
    recent = df.tail(n).copy()
    recent.index = recent.index.strftime("%Y-%m-%d")
    lines = ["Date,Open,High,Low,Close"]
    for date, row in recent.iterrows():
        o, h, l, c = row["Open"], row["High"], row["Low"], row["Close"]
        # Determine decimal places based on price magnitude
        dp = 2 if c > 100 else 3 if c > 10 else 5
        fmt = f"{{:.{dp}f}}"
        lines.append(f"{date},{fmt.format(o)},{fmt.format(h)},{fmt.format(l)},{fmt.format(c)}")
    return "\n".join(lines)


def analyse_with_claude(
    symbol: str,
    daily_df: pd.DataFrame,
    weekly_df: pd.DataFrame,
    date: str,
) -> dict:
    """
    Send price data to Claude for full ICT analysis.
    Returns a dict matching the InstrumentBias schema.
    Raises on API error (caller should catch and fall back).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY not set")

    current_price = float(daily_df["Close"].iloc[-1])

    user_prompt = f"""\
Instrument: {symbol}
Analysis Date: {date}
Current Price: {current_price}

=== WEEKLY CANDLES (last 20 bars — higher timeframe context) ===
{_format_candles(weekly_df, 20)}

=== DAILY CANDLES (last 40 bars — current structure and POIs) ===
{_format_candles(daily_df, 40)}

Perform a full ICT analysis for {symbol} and return the JSON object as instructed.\
"""

    client = anthropic.Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Extract the text block (skip thinking blocks)
    raw_text = ""
    for block in response.content:
        if block.type == "text":
            raw_text += block.text

    # Parse JSON — Claude may wrap it in ```json ... ``` fences
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip().rstrip("`").strip()

    result = json.loads(raw_text)

    # Always inject current_price and symbol (not in Claude's output schema)
    result["symbol"] = symbol
    result["current_price"] = round(current_price, 6)

    # Inject timestamps so existing serialisation helpers don't break
    now_iso = datetime.now(timezone.utc).isoformat()
    if result.get("nearest_ob"):
        result["nearest_ob"].setdefault("timestamp", now_iso)
    if result.get("nearest_fvg"):
        result["nearest_fvg"].setdefault("timestamp", now_iso)
        # Ensure ce is present
        fvg = result["nearest_fvg"]
        if "ce" not in fvg and "top" in fvg and "bottom" in fvg:
            fvg["ce"] = round((fvg["top"] + fvg["bottom"]) / 2, 6)

    return result
