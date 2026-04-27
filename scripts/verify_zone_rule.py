"""
verify_zone_rule.py
Tests the simplified rule: ignore structure label entirely,
predict Bullish if price is in Premium, Bearish if in Discount.

If this matches Filter 9's 58.7%, we've found the actual signal.
"""

import os
import pandas as pd

CSV = os.path.join(os.path.dirname(__file__), "feature_analysis.csv")


def main() -> None:
    df = pd.read_csv(CSV)

    # Apply zone-only rule: predicted = Bullish if Premium, Bearish if Discount
    # `correct` in csv was scored against price direction during killzone.
    # We need to recompute correctness for this new prediction.
    #
    # We can derive it from the existing data:
    #   original_correct = (daily_bias == "Bullish" and price_rose) or
    #                      (daily_bias == "Bearish" and not price_rose)
    # so:
    #   price_rose = (daily_bias == "Bullish") == correct
    df["price_rose"] = (df["daily_bias"] == "Bullish") == df["correct"]

    # New rule
    df["zone_pred"] = df["premium_disc"].map({
        "Premium":   "Bullish",
        "Discount":  "Bearish",
        "Equilibrium": None,
    })
    df["zone_correct"] = (
        ((df["zone_pred"] == "Bullish") &  df["price_rose"]) |
        ((df["zone_pred"] == "Bearish") & ~df["price_rose"])
    )

    keep = df[df["zone_pred"].notna()]

    print("=" * 60)
    print("  ZONE-ONLY RULE: Premium=Bull, Discount=Bear")
    print("=" * 60)
    n   = len(keep)
    win = keep["zone_correct"].mean() * 100
    print(f"\n  Overall: N = {n}   Win = {win:.1f}%")

    print(f"\n  {'Symbol':<10} {'N':>5} {'Win%':>7}")
    by = keep.groupby("symbol")["zone_correct"].agg(["mean","count"]).sort_values("mean", ascending=False)
    for s, r in by.iterrows():
        print(f"  {s:<10} {int(r['count']):>5} {r['mean']*100:>6.1f}%")

    # Also slice by zone alone
    print(f"\n  By zone:")
    for z in ["Premium", "Discount"]:
        sub = keep[keep["premium_disc"] == z]
        print(f"  {z:<10}  N={len(sub):>4}   Win={sub['zone_correct'].mean()*100:.1f}%")

    # And by asset class
    print(f"\n  By asset class:")
    for ac in keep["asset_class"].unique():
        sub = keep[keep["asset_class"] == ac]
        print(f"  {ac:<10}  N={len(sub):>4}   Win={sub['zone_correct'].mean()*100:.1f}%")

    # Confidence band cross-check
    keep_c = keep.copy()
    keep_c["conf_band"] = pd.cut(keep_c["confidence"], bins=[0,3,5,7,10],
                                  labels=["1-3","4-5","6-7","8-10"])
    print(f"\n  By confidence band:")
    for cb, sub in keep_c.groupby("conf_band", observed=True):
        if len(sub) < 30:
            continue
        print(f"  {str(cb):<10}  N={len(sub):>4}   Win={sub['zone_correct'].mean()*100:.1f}%")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
