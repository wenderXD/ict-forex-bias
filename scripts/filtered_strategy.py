"""
filtered_strategy.py
Loads the feature_analysis.csv and tests selective trade filters.

Strategy hypothesis (from feature analysis):
  Take only continuation setups —
    Bullish + Premium structure agreement
    Bearish + Discount structure agreement
  Skip the textbook reversal setups (they fail at ~40%).
"""

import os
import pandas as pd

CSV = os.path.join(os.path.dirname(__file__), "feature_analysis.csv")


def show(df: pd.DataFrame, label: str) -> None:
    if df.empty:
        print(f"\n  [{label}] no setups")
        return
    n   = len(df)
    win = df["correct"].mean() * 100
    print(f"\n  [{label}]  N = {n}   Win = {win:.1f}%")

    # Per-instrument
    print(f"  {'Symbol':<10} {'N':>5} {'Win%':>7}")
    by_sym = df.groupby("symbol")["correct"].agg(["mean","count"]).sort_values("mean", ascending=False)
    for sym, row in by_sym.iterrows():
        if row["count"] < 10:
            continue
        print(f"  {sym:<10} {int(row['count']):>5} {row['mean']*100:>6.1f}%")


def main() -> None:
    df = pd.read_csv(CSV)

    print("=" * 60)
    print("  FILTERED STRATEGY TESTS")
    print("=" * 60)

    # Baseline
    show(df, "BASELINE  (every signal)")

    # Filter 1 — continuation: structure direction matches zone
    cont = df[
        ((df["daily_bias"] == "Bullish") & (df["premium_disc"] == "Premium")) |
        ((df["daily_bias"] == "Bearish") & (df["premium_disc"] == "Discount"))
    ]
    show(cont, "FILTER 1: Continuation only (Bull+Prem | Bear+Disc)")

    # Filter 2 — continuation, non-forex only
    cont_nf = cont[cont["asset_class"] == "non-forex"]
    show(cont_nf, "FILTER 2: Continuation + non-forex only")

    # Filter 3 — continuation + HTF aligned
    cont_htf = cont[cont["htf_aligned"] == True]
    show(cont_htf, "FILTER 3: Continuation + weekly aligned")

    # Filter 4 — continuation + non-forex + HTF aligned
    cont_nf_htf = cont_nf[cont_nf["htf_aligned"] == True]
    show(cont_nf_htf, "FILTER 4: Continuation + non-forex + HTF aligned")

    # Filter 5 — continuation + confidence in the 4-5 sweet spot from feature_analysis
    cont_c45 = cont[cont["confidence"].between(4, 5)]
    show(cont_c45, "FILTER 5: Continuation + confidence 4-5")

    # Filter 6 — same but non-forex + conf 4-5
    cont_nf_c45 = cont_nf[cont_nf["confidence"].between(4, 5)]
    show(cont_nf_c45, "FILTER 6: Continuation + non-forex + conf 4-5")

    # Filter 7 — Inverted: REVERSAL (just to confirm it's bad)
    rev = df[
        ((df["daily_bias"] == "Bullish") & (df["premium_disc"] == "Discount")) |
        ((df["daily_bias"] == "Bearish") & (df["premium_disc"] == "Premium"))
    ]
    show(rev, "FILTER 7: Reversal (textbook ICT) — should be bad")

    # Filter 8 — Counter-trade reversal (flip direction on reversal setups)
    rev_flip = rev.copy()
    rev_flip["correct"] = ~rev_flip["correct"].astype(bool)
    show(rev_flip, "FILTER 8: COUNTER-TRADE reversal setups (flip direction)")

    # Filter 9 — Combine: continuation OR counter-traded reversal
    comb = pd.concat([
        cont,
        rev.assign(correct=lambda d: ~d["correct"].astype(bool)),
    ])
    show(comb, "FILTER 9: Continuation + counter-traded reversal (uses every day)")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
