"""
ai_narrative.py
Generates ICT bias narratives using Claude claude-opus-4-6 (Anthropic API).
Falls back to the rule-based narrative if the API key is not set or a call fails.
"""

import os
import anthropic
from ict_analysis import ICTAnalysis

# System prompt is the same for every instrument — cache it across all 12 calls
SYSTEM_PROMPT = """\
You are an expert forex and financial markets analyst specialising in ICT \
(Inner Circle Trader) methodology and Smart Money Concepts (SMC). \
You have deep knowledge of market structure, order blocks, fair value gaps, \
liquidity pools, premium/discount arrays, killzones, and the Power of 3.

Your task: write a professional, concise daily bias narrative (3–5 short paragraphs) \
for a trading instrument, based on structured technical data provided by the user.

Rules:
- Reference ICT concepts by name (order block, FVG, BSL/SSL, BOS, ChoCH, etc.)
- Be specific with price levels — always quote the numbers given
- Explain the *reasoning* behind the bias, not just the conclusion
- If confidence is low (≤ 4), acknowledge uncertainty clearly
- End with a practical note: what to watch for during London or New York killzone
- Do NOT fabricate levels or concepts not present in the data
- Keep it professional, direct, and actionable — no fluff
"""


def _build_prompt(a: ICTAnalysis, date: str) -> str:
    """Build the user prompt from an ICTAnalysis object."""

    def fmt(v: float) -> str:
        if v < 10:
            return f"{v:.2f}"
        if v < 1_000:
            return f"{v:.3f}"
        return f"{v:.5f}"

    liq_bsl = [l for l in a.liquidity_levels if l.kind == "BSL"]
    liq_ssl = [l for l in a.liquidity_levels if l.kind == "SSL"]

    bsl_str = ", ".join(
        f"{fmt(l.price)}{'*' if l.equal else ''}" for l in liq_bsl[:5]
    ) or "None identified"
    ssl_str = ", ".join(
        f"{fmt(l.price)}{'*' if l.equal else ''}" for l in liq_ssl[:5]
    ) or "None identified"

    ob_str = "None identified"
    if a.nearest_ob:
        ob = a.nearest_ob
        ob_str = (
            f"{ob.kind.capitalize()} Order Block D1: "
            f"{fmt(ob.low)} – {fmt(ob.high)}"
        )

    fvg_str = "None identified"
    if a.nearest_fvg:
        fvg = a.nearest_fvg
        fvg_str = (
            f"{fvg.kind.capitalize()} Fair Value Gap D1: "
            f"{fmt(fvg.bottom)} – {fmt(fvg.top)} "
            f"(CE: {fmt(fvg.ce)})"
        )

    return f"""\
Instrument: {a.symbol}
Date: {date}
Current Price: {fmt(a.current_price)}

=== Market Structure ===
Weekly Bias: {a.weekly_bias}
Daily Bias:  {a.daily_bias}
Structure:   {a.structure_label}
Last BOS/ChoCH: {a.last_bos}

=== Price Position ===
Premium/Discount: {a.premium_discount}
Equilibrium (50%): {fmt(a.equilibrium)}
Swing High: {fmt(a.swing_high)}
Swing Low:  {fmt(a.swing_low)}

=== Key Levels ===
Previous Day High: {fmt(a.previous_day_high)}
Previous Day Low:  {fmt(a.previous_day_low)}
Previous Week High: {fmt(a.previous_week_high)}
Previous Week Low:  {fmt(a.previous_week_low)}

=== Points of Interest ===
Nearest Order Block: {ob_str}
Nearest FVG:         {fvg_str}

=== Liquidity ===
Buy-Side Liquidity (BSL): {bsl_str}
Sell-Side Liquidity (SSL): {ssl_str}
(* = Equal High/Low — EQH/EQL)

=== Draw on Liquidity ===
{a.draw_on_liquidity}

=== Confidence: {a.confidence}/10 ===

Write a professional ICT-style daily bias narrative for {a.symbol}.\
"""


def generate_ai_narrative(analysis: ICTAnalysis, date: str) -> str:
    """
    Call Claude claude-opus-4-6 to generate the narrative.
    Returns the AI narrative string, or falls back to the rule-based one on error.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print(f"    [ai_narrative] ANTHROPIC_API_KEY not set — using rule-based narrative")
        return analysis.narrative   # fallback

    try:
        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},   # cache system prompt across all 12 calls
                }
            ],
            messages=[
                {"role": "user", "content": _build_prompt(analysis, date)}
            ],
        )

        # Extract text from response (skip thinking blocks)
        narrative = ""
        for block in response.content:
            if block.type == "text":
                narrative += block.text

        return narrative.strip() if narrative.strip() else analysis.narrative

    except Exception as e:
        print(f"    [ai_narrative] API error for {analysis.symbol}: {e} — using rule-based fallback")
        return analysis.narrative   # fallback
