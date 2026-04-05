"""
ict_analysis.py
Core ICT analysis engine.
Implements: swing detection, market structure, BOS/ChoCH,
liquidity pools, order blocks, FVGs, premium/discount, bias scoring.
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Literal


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class SwingPoint:
    index: int
    timestamp: pd.Timestamp
    price: float
    kind: Literal["high", "low"]


@dataclass
class OrderBlock:
    timestamp: pd.Timestamp
    high: float
    low: float
    kind: Literal["bullish", "bearish"]
    mitigated: bool = False


@dataclass
class FVG:
    timestamp: pd.Timestamp
    top: float
    bottom: float
    ce: float          # consequent encroachment (50%)
    kind: Literal["bullish", "bearish"]
    filled: bool = False


@dataclass
class LiquidityLevel:
    price: float
    kind: Literal["BSL", "SSL"]   # buy-side or sell-side
    equal: bool = False            # EQH / EQL


@dataclass
class ICTAnalysis:
    symbol: str
    current_price: float
    # Structure
    weekly_bias: Literal["Bullish", "Bearish", "Neutral"]
    daily_bias: Literal["Bullish", "Bearish", "Neutral"]
    structure_label: str          # e.g. "HH+HL (Bullish)"
    last_bos: str                 # e.g. "Bullish BOS at 1.0950"
    # Levels
    swing_high: float
    swing_low: float
    premium_discount: Literal["Premium", "Discount", "Equilibrium"]
    equilibrium: float
    previous_day_high: float
    previous_day_low: float
    previous_week_high: float
    previous_week_low: float
    # POIs
    nearest_ob: OrderBlock | None
    nearest_fvg: FVG | None
    liquidity_levels: list[LiquidityLevel] = field(default_factory=list)
    # Scoring
    confidence: int = 5            # 1–10
    draw_on_liquidity: str = ""
    key_poi_label: str = ""
    narrative: str = ""


# ---------------------------------------------------------------------------
# Swing detection
# ---------------------------------------------------------------------------

def detect_swings(df: pd.DataFrame, left: int = 3, right: int = 3) -> list[SwingPoint]:
    """
    Detect pivot highs and pivot lows.
    A pivot high: High[i] is the highest among [i-left .. i+right].
    A pivot low:  Low[i]  is the lowest  among [i-left .. i+right].
    """
    highs = df["High"].values
    lows  = df["Low"].values
    ts    = df.index
    swings = []

    for i in range(left, len(df) - right):
        window_h = highs[i - left: i + right + 1]
        window_l = lows[i  - left: i + right + 1]

        if highs[i] == window_h.max():
            swings.append(SwingPoint(i, ts[i], highs[i], "high"))
        if lows[i] == window_l.min():
            swings.append(SwingPoint(i, ts[i], lows[i], "low"))

    # Sort by index, deduplicate same-bar highs and lows
    swings.sort(key=lambda s: (s.index, s.kind))
    return swings


# ---------------------------------------------------------------------------
# Market structure
# ---------------------------------------------------------------------------

def classify_structure(swings: list[SwingPoint], lookback: int = 6
                        ) -> tuple[Literal["Bullish", "Bearish", "Neutral"], str]:
    """
    Compare the last `lookback` swing highs and lows.
    Returns (bias, label string).
    """
    highs = [s for s in swings if s.kind == "high"][-lookback:]
    lows  = [s for s in swings if s.kind == "low"][-lookback:]

    if len(highs) < 2 or len(lows) < 2:
        return "Neutral", "Insufficient data"

    # Check last 2 pairs
    hh = sum(1 for i in range(1, len(highs)) if highs[i].price > highs[i-1].price)
    lh = sum(1 for i in range(1, len(highs)) if highs[i].price < highs[i-1].price)
    hl = sum(1 for i in range(1, len(lows))  if lows[i].price  > lows[i-1].price)
    ll = sum(1 for i in range(1, len(lows))  if lows[i].price  < lows[i-1].price)

    bull_score = hh + hl
    bear_score = lh + ll

    if bull_score > bear_score and bull_score >= 2:
        label = f"HH+HL (Bullish) – HH:{hh} HL:{hl}"
        return "Bullish", label
    elif bear_score > bull_score and bear_score >= 2:
        label = f"LH+LL (Bearish) – LH:{lh} LL:{ll}"
        return "Bearish", label
    else:
        label = f"Mixed structure – HH:{hh} HL:{hl} LH:{lh} LL:{ll}"
        return "Neutral", label


# ---------------------------------------------------------------------------
# BOS / ChoCH detection
# ---------------------------------------------------------------------------

def detect_last_bos(df: pd.DataFrame, swings: list[SwingPoint], bias: str) -> str:
    """
    Returns a description of the most recent BOS or ChoCH.
    """
    closes = df["Close"].values
    ts     = df.index

    highs = [s for s in swings if s.kind == "high"]
    lows  = [s for s in swings if s.kind == "low"]

    if not highs or not lows:
        return "No structure break detected"

    last_swing_high = highs[-1]
    last_swing_low  = lows[-1]
    last_close      = closes[-1]
    last_ts         = ts[-1]

    # Check if recent close broke a swing
    if last_close > last_swing_high.price:
        kind = "BOS" if bias in ("Bullish", "Neutral") else "ChoCH"
        return f"Bullish {kind} – close broke swing high {last_swing_high.price:.5f}"
    elif last_close < last_swing_low.price:
        kind = "BOS" if bias in ("Bearish", "Neutral") else "ChoCH"
        return f"Bearish {kind} – close broke swing low {last_swing_low.price:.5f}"
    else:
        return f"Price between swing high {last_swing_high.price:.5f} and swing low {last_swing_low.price:.5f}"


# ---------------------------------------------------------------------------
# Liquidity levels
# ---------------------------------------------------------------------------

def detect_liquidity(swings: list[SwingPoint], tolerance_pct: float = 0.0015
                     ) -> list[LiquidityLevel]:
    """
    Identify BSL (above swing highs) and SSL (below swing lows).
    Mark EQH/EQL when two swing points are within `tolerance_pct` of each other.
    """
    levels = []
    highs = [s for s in swings if s.kind == "high"][-10:]
    lows  = [s for s in swings if s.kind == "low"][-10:]

    def is_equal(a: float, b: float) -> bool:
        return abs(a - b) / max(abs(a), abs(b), 1e-9) < tolerance_pct

    seen_h = set()
    for i, h in enumerate(highs):
        is_eq = any(is_equal(h.price, highs[j].price) for j in range(len(highs)) if j != i)
        key = round(h.price, 5)
        if key not in seen_h:
            levels.append(LiquidityLevel(h.price, "BSL", is_eq))
            seen_h.add(key)

    seen_l = set()
    for i, l in enumerate(lows):
        is_eq = any(is_equal(l.price, lows[j].price) for j in range(len(lows)) if j != i)
        key = round(l.price, 5)
        if key not in seen_l:
            levels.append(LiquidityLevel(l.price, "SSL", is_eq))
            seen_l.add(key)

    return levels


# ---------------------------------------------------------------------------
# Order Blocks
# ---------------------------------------------------------------------------

def detect_order_blocks(df: pd.DataFrame, swings: list[SwingPoint]) -> list[OrderBlock]:
    """
    Bullish OB: last bearish candle (close < open) before a bullish impulse
                that creates a swing high.
    Bearish OB: last bullish candle (close > open) before a bearish impulse
                that creates a swing low.
    """
    obs = []
    closes = df["Close"].values
    opens  = df["Open"].values
    highs  = df["High"].values
    lows   = df["Low"].values
    ts     = df.index

    for swing in swings[-20:]:
        i = swing.index
        if i < 3 or i >= len(df):
            continue

        if swing.kind == "high":
            # Look back for last bearish candle before this swing
            for j in range(i - 1, max(i - 10, 0), -1):
                if closes[j] < opens[j]:   # bearish candle
                    mitigated = lows[-1] < lows[j]
                    obs.append(OrderBlock(
                        timestamp=ts[j],
                        high=highs[j],
                        low=lows[j],
                        kind="bullish",
                        mitigated=mitigated,
                    ))
                    break

        elif swing.kind == "low":
            # Look back for last bullish candle before this swing
            for j in range(i - 1, max(i - 10, 0), -1):
                if closes[j] > opens[j]:   # bullish candle
                    mitigated = highs[-1] > highs[j]
                    obs.append(OrderBlock(
                        timestamp=ts[j],
                        high=highs[j],
                        low=lows[j],
                        kind="bearish",
                        mitigated=mitigated,
                    ))
                    break

    return obs


def nearest_unmitigated_ob(obs: list[OrderBlock], current_price: float,
                            bias: str) -> OrderBlock | None:
    """Return the closest unmitigated OB aligned with the bias."""
    candidates = [ob for ob in obs if not ob.mitigated]
    if bias == "Bullish":
        candidates = [ob for ob in candidates
                      if ob.kind == "bullish" and ob.high < current_price]
    elif bias == "Bearish":
        candidates = [ob for ob in candidates
                      if ob.kind == "bearish" and ob.low > current_price]

    if not candidates:
        return None
    return min(candidates, key=lambda ob: abs((ob.high + ob.low) / 2 - current_price))


# ---------------------------------------------------------------------------
# Fair Value Gaps
# ---------------------------------------------------------------------------

def detect_fvgs(df: pd.DataFrame) -> list[FVG]:
    """
    Bullish FVG: candle[i-1].high < candle[i+1].low  (gap up)
    Bearish FVG: candle[i-1].low  > candle[i+1].high (gap down)
    """
    fvgs = []
    highs  = df["High"].values
    lows   = df["Low"].values
    closes = df["Close"].values
    ts     = df.index

    for i in range(1, len(df) - 1):
        # Bullish FVG
        if highs[i-1] < lows[i+1]:
            top    = lows[i+1]
            bottom = highs[i-1]
            ce     = (top + bottom) / 2
            # Check if later price filled it
            filled = any(lows[j] <= bottom for j in range(i+2, len(df)))
            fvgs.append(FVG(ts[i], top, bottom, ce, "bullish", filled))

        # Bearish FVG
        elif lows[i-1] > highs[i+1]:
            top    = lows[i-1]
            bottom = highs[i+1]
            ce     = (top + bottom) / 2
            filled = any(highs[j] >= top for j in range(i+2, len(df)))
            fvgs.append(FVG(ts[i], top, bottom, ce, "bearish", filled))

    return fvgs


def nearest_unfilled_fvg(fvgs: list[FVG], current_price: float,
                          bias: str) -> FVG | None:
    """Return the closest unfilled FVG aligned with the bias."""
    candidates = [f for f in fvgs if not f.filled]
    if bias == "Bullish":
        candidates = [f for f in candidates
                      if f.kind == "bullish" and f.top < current_price]
    elif bias == "Bearish":
        candidates = [f for f in candidates
                      if f.kind == "bearish" and f.bottom > current_price]

    if not candidates:
        return None
    return min(candidates, key=lambda f: abs(f.ce - current_price))


# ---------------------------------------------------------------------------
# Premium / Discount
# ---------------------------------------------------------------------------

def premium_discount(current_price: float, swing_high: float, swing_low: float
                     ) -> tuple[Literal["Premium", "Discount", "Equilibrium"], float]:
    eq = (swing_high + swing_low) / 2
    threshold = (swing_high - swing_low) * 0.05   # 5% band around EQ
    if current_price > eq + threshold:
        return "Premium", eq
    elif current_price < eq - threshold:
        return "Discount", eq
    else:
        return "Equilibrium", eq


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------

def score_confidence(
    weekly_bias: str,
    daily_bias: str,
    pd_zone: str,
    nearest_ob: OrderBlock | None,
    nearest_fvg: FVG | None,
    liquidity: list[LiquidityLevel],
    current_price: float,
) -> int:
    score = 0

    # 1. Weekly and daily bias aligned (+3)
    if weekly_bias == daily_bias and daily_bias != "Neutral":
        score += 3
    elif weekly_bias == daily_bias:
        score += 1

    # 2. Price at valid POI (+2)
    if nearest_ob is not None:
        score += 2
    elif nearest_fvg is not None:
        score += 1

    # 3. Premium/Discount appropriate to bias (+2)
    if daily_bias == "Bullish" and pd_zone == "Discount":
        score += 2
    elif daily_bias == "Bearish" and pd_zone == "Premium":
        score += 2
    elif pd_zone == "Equilibrium":
        score += 1

    # 4. Clear liquidity draw (+2)
    draw_candidates = [l for l in liquidity
                       if (l.kind == "BSL" and daily_bias == "Bullish") or
                          (l.kind == "SSL" and daily_bias == "Bearish")]
    if draw_candidates:
        score += 2

    # 5. EQH/EQL present (high-probability target) (+1)
    if any(l.equal for l in liquidity):
        score += 1

    return min(max(score, 1), 10)


# ---------------------------------------------------------------------------
# Draw on liquidity label
# ---------------------------------------------------------------------------

def find_draw(liquidity: list[LiquidityLevel], daily_bias: str,
              current_price: float) -> str:
    if daily_bias == "Bullish":
        targets = sorted(
            [l for l in liquidity if l.kind == "BSL" and l.price > current_price],
            key=lambda l: l.price
        )
    else:
        targets = sorted(
            [l for l in liquidity if l.kind == "SSL" and l.price < current_price],
            key=lambda l: l.price,
            reverse=True
        )

    if not targets:
        return "No clear liquidity draw identified"

    t = targets[0]
    eq_label = " (EQH)" if (t.kind == "BSL" and t.equal) else \
               " (EQL)" if (t.kind == "SSL" and t.equal) else ""
    return f"{t.kind}{eq_label} at {t.price:.5f}"


# ---------------------------------------------------------------------------
# Narrative builder
# ---------------------------------------------------------------------------

def build_narrative(
    symbol: str,
    weekly_bias: str,
    daily_bias: str,
    structure_label: str,
    pd_zone: str,
    eq: float,
    current_price: float,
    pdh: float,
    pdl: float,
    draw: str,
    ob: OrderBlock | None,
    fvg: FVG | None,
    last_bos: str,
    confidence: int,
) -> str:
    parts = []

    # HTF context
    parts.append(
        f"On the weekly timeframe, {symbol} is showing a {weekly_bias.lower()} bias "
        f"with {structure_label.lower()}."
    )

    # Price location
    above_below = "above" if current_price > eq else "below"
    parts.append(
        f"Price is currently {above_below} equilibrium "
        f"({eq:.5f}), placing it in a {pd_zone.lower()} zone. "
        f"Previous day high is {pdh:.5f} and previous day low is {pdl:.5f}."
    )

    # Structure
    parts.append(f"Market structure: {last_bos}.")

    # POI
    if ob:
        parts.append(
            f"There is an unmitigated {ob.kind} order block between "
            f"{ob.low:.5f} and {ob.high:.5f} - a key POI for potential reaction."
        )
    elif fvg:
        parts.append(
            f"A {fvg.kind} fair value gap exists between {fvg.bottom:.5f} and {fvg.top:.5f} "
            f"(CE: {fvg.ce:.5f}) - price may seek to fill this imbalance."
        )

    # Draw
    parts.append(f"The draw on liquidity is: {draw}.")

    # Conclusion
    bias_word = daily_bias.lower()
    if confidence >= 7:
        strength = "high-confidence"
    elif confidence >= 5:
        strength = "moderate"
    else:
        strength = "low-confidence"

    parts.append(
        f"Overall, the daily bias for {symbol} is {bias_word} ({strength}, {confidence}/10). "
        f"{'Look for buys from discount POIs during London or NY killzone.' if daily_bias == 'Bullish' else 'Look for sells from premium POIs during London or NY killzone.' if daily_bias == 'Bearish' else 'No clear directional bias - wait for a structural shift or liquidity sweep.'}"
    )

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Main analysis function
# ---------------------------------------------------------------------------

def analyse(symbol: str, daily_df: pd.DataFrame, weekly_df: pd.DataFrame) -> ICTAnalysis:
    """
    Run full ICT analysis on a single instrument.
    `daily_df`  – D1 OHLCV DataFrame
    `weekly_df` – W1 OHLCV DataFrame
    """
    if daily_df.empty or len(daily_df) < 20:
        raise ValueError(f"Not enough daily data for {symbol}")

    # --- Current price ---
    current_price = float(daily_df["Close"].iloc[-1])

    # --- Previous day / week ---
    pdh = float(daily_df["High"].iloc[-2])  if len(daily_df) >= 2 else current_price
    pdl = float(daily_df["Low"].iloc[-2])   if len(daily_df) >= 2 else current_price
    pwh = float(weekly_df["High"].iloc[-2]) if len(weekly_df) >= 2 else current_price
    pwl = float(weekly_df["Low"].iloc[-2])  if len(weekly_df) >= 2 else current_price

    # --- Swing detection ---
    d_swings = detect_swings(daily_df,  left=3, right=3)
    w_swings = detect_swings(weekly_df, left=2, right=2)

    # --- Market structure ---
    daily_struct,  d_label = classify_structure(d_swings,  lookback=6)
    weekly_struct, _       = classify_structure(w_swings,  lookback=4)

    # --- BOS / ChoCH ---
    last_bos = detect_last_bos(daily_df, d_swings, daily_struct)

    # --- Key swing levels (most recent) ---
    d_highs = [s for s in d_swings if s.kind == "high"]
    d_lows  = [s for s in d_swings if s.kind == "low"]
    swing_high = d_highs[-1].price if d_highs else float(daily_df["High"].max())
    swing_low  = d_lows[-1].price  if d_lows  else float(daily_df["Low"].min())

    # --- Premium / Discount ---
    pd_zone, eq = premium_discount(current_price, swing_high, swing_low)

    # --- Liquidity ---
    liquidity = detect_liquidity(d_swings)

    # --- Order Blocks ---
    d_obs  = detect_order_blocks(daily_df, d_swings)
    ob     = nearest_unmitigated_ob(d_obs, current_price, daily_struct)

    # --- FVGs ---
    d_fvgs = detect_fvgs(daily_df)
    fvg    = nearest_unfilled_fvg(d_fvgs, current_price, daily_struct)

    # --- Draw on liquidity ---
    draw = find_draw(liquidity, daily_struct, current_price)

    # --- Key POI label ---
    if ob:
        poi_label = f"{ob.kind.capitalize()} OB D1: {ob.low:.5f}–{ob.high:.5f}"
    elif fvg:
        poi_label = f"{fvg.kind.capitalize()} FVG D1: {fvg.bottom:.5f}–{fvg.top:.5f}"
    else:
        poi_label = "No nearby unmitigated POI"

    # --- Confidence ---
    confidence = score_confidence(
        weekly_struct, daily_struct, pd_zone, ob, fvg, liquidity, current_price
    )

    # --- Narrative ---
    narrative = build_narrative(
        symbol, weekly_struct, daily_struct, d_label,
        pd_zone, eq, current_price,
        pdh, pdl, draw, ob, fvg, last_bos, confidence
    )

    return ICTAnalysis(
        symbol=symbol,
        current_price=current_price,
        weekly_bias=weekly_struct,
        daily_bias=daily_struct,
        structure_label=d_label,
        last_bos=last_bos,
        swing_high=swing_high,
        swing_low=swing_low,
        premium_discount=pd_zone,
        equilibrium=eq,
        previous_day_high=pdh,
        previous_day_low=pdl,
        previous_week_high=pwh,
        previous_week_low=pwl,
        nearest_ob=ob,
        nearest_fvg=fvg,
        liquidity_levels=liquidity,
        confidence=confidence,
        draw_on_liquidity=draw,
        key_poi_label=poi_label,
        narrative=narrative,
    )
