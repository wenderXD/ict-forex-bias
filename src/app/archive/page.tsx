import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Header from "@/components/Header";
import { DailyBias } from "@/types/bias";

function getDateIndex(): string[] {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "bias", "index.json"), "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function getBias(date: string): DailyBias | null {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "bias", `${date}.json`), "utf-8");
    return JSON.parse(raw) as DailyBias;
  } catch {
    return null;
  }
}

interface OutcomeResult {
  correct: number;
  total: number;
}

function computeOutcome(bias: DailyBias, nextBias: DailyBias): OutcomeResult {
  let correct = 0;
  let total = 0;

  for (const inst of bias.instruments) {
    if (inst.daily_bias === "Neutral") continue;
    const next = nextBias.instruments.find((n) => n.symbol === inst.symbol);
    if (!next || inst.current_price == null || next.current_price == null) continue;
    if (inst.current_price === next.current_price) continue;

    total++;
    const priceRose = next.current_price > inst.current_price;
    if ((inst.daily_bias === "Bullish" && priceRose) || (inst.daily_bias === "Bearish" && !priceRose)) {
      correct++;
    }
  }

  return { correct, total };
}

function outcomeColor(correct: number, total: number): string {
  if (total === 0) return "text-muted";
  const pct = correct / total;
  if (pct >= 0.67) return "text-bullish";
  if (pct >= 0.5) return "text-neutral";
  return "text-bearish";
}

export default function ArchivePage() {
  const dates = getDateIndex();
  const today = dates[0] ?? new Date().toISOString().split("T")[0];

  // Pre-compute outcomes for all dates that have a next-day file
  // dates is sorted newest→oldest, so dates[idx-1] is the next trading day for dates[idx]
  const outcomes: Map<string, OutcomeResult | null> = new Map();
  for (let idx = 0; idx < dates.length; idx++) {
    if (idx === 0) {
      outcomes.set(dates[idx], null); // today — day not closed yet
      continue;
    }
    const bias = getBias(dates[idx]);
    const nextBias = getBias(dates[idx - 1]);
    if (!bias || !nextBias) {
      outcomes.set(dates[idx], null);
    } else {
      outcomes.set(dates[idx], computeOutcome(bias, nextBias));
    }
  }

  // Overall accuracy + per-symbol stats for DXY and SPX500
  let totalCorrect = 0;
  let totalPredictions = 0;
  const indexStats: Record<string, { correct: number; total: number }> = {
    DXY: { correct: 0, total: 0 },
    SPX500: { correct: 0, total: 0 },
  };

  for (let idx = 1; idx < dates.length; idx++) {
    const bias = getBias(dates[idx]);
    const nextBias = getBias(dates[idx - 1]);
    if (!bias || !nextBias) continue;

    for (const symbol of ["DXY", "SPX500"]) {
      const inst = bias.instruments.find((i) => i.symbol === symbol);
      const next = nextBias.instruments.find((i) => i.symbol === symbol);
      if (!inst || !next || inst.daily_bias === "Neutral") continue;
      if (inst.current_price == null || next.current_price == null) continue;
      if (inst.current_price === next.current_price) continue;
      indexStats[symbol].total++;
      const priceRose = next.current_price > inst.current_price;
      if ((inst.daily_bias === "Bullish" && priceRose) || (inst.daily_bias === "Bearish" && !priceRose)) {
        indexStats[symbol].correct++;
      }
    }
  }

  for (const [, out] of outcomes) {
    if (out) {
      totalCorrect += out.correct;
      totalPredictions += out.total;
    }
  }

  return (
    <div className="min-h-screen">
      <Header date={today} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-muted text-[13px] font-mono font-medium hover:text-text-secondary transition-colors inline-flex items-center gap-1.5 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to today</span>
          </Link>
          <p className="text-muted text-[13px] font-mono font-bold uppercase tracking-[0.18em] mb-1.5">
            Historical Records
          </p>
          <h1 className="display text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            Archive
          </h1>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <p className="text-text-secondary text-[15px] font-mono font-medium">
              {dates.length} session{dates.length !== 1 ? "s" : ""} recorded
            </p>
            {totalPredictions > 0 && (
              <p className={`text-[15px] font-mono font-semibold ${outcomeColor(totalCorrect, totalPredictions)}`}>
                {totalCorrect}/{totalPredictions} correct ({Math.round((totalCorrect / totalPredictions) * 100)}%)
              </p>
            )}
          </div>
        </div>

        {/* Index accuracy stats */}
        {(indexStats.DXY.total > 0 || indexStats.SPX500.total > 0) && (
          <div className="mb-6 border border-border rounded-lg bg-card px-4 py-3 flex items-center gap-6 flex-wrap">
            <span className="text-muted text-[13px] font-mono font-bold uppercase tracking-wider shrink-0">
              Index accuracy
            </span>
            {(["DXY", "SPX500"] as const).map((sym) => {
              const s = indexStats[sym];
              if (s.total === 0) return null;
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <div key={sym} className="flex items-center gap-2">
                  <span className="text-text-secondary text-[13px] font-mono font-semibold">{sym}</span>
                  <span className={`text-[13px] font-mono font-bold ${outcomeColor(s.correct, s.total)}`}>
                    {s.correct}/{s.total}
                  </span>
                  <span className={`text-[13px] font-mono font-medium ${outcomeColor(s.correct, s.total)}`}>
                    ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {dates.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center bg-card">
            <p className="text-text-secondary font-mono text-sm">
              No historical data yet.
            </p>
            <p className="text-muted font-mono text-[13px] font-medium mt-1">
              Check back after the first automated run.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
              <span className="text-muted text-[13px] font-mono font-bold uppercase tracking-wider">Date</span>
              <div className="flex items-center gap-6">
                <span className="text-muted text-[13px] font-mono font-bold uppercase tracking-wider hidden sm:inline">Bias</span>
                <span className="text-muted text-[13px] font-mono font-bold uppercase tracking-wider">Result</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/60">
              {dates.map((date, idx) => {
                const bias = getBias(date);
                const bull = bias?.instruments.filter((i) => i.daily_bias === "Bullish").length ?? 0;
                const bear = bias?.instruments.filter((i) => i.daily_bias === "Bearish").length ?? 0;
                const neut = (bias?.instruments.length ?? 0) - bull - bear;
                const outcome = outcomes.get(date) ?? null;

                const formattedDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                const isToday = date === today && idx === 0;

                return (
                  <Link
                    key={date}
                    href={`/archive/${date}/`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-text-primary text-[15px] font-mono font-semibold group-hover:text-accent transition-colors">
                        {formattedDate}
                      </span>
                      {isToday && (
                        <span className="text-[11px] font-mono font-bold bg-accent/15 text-accent border border-accent/30 px-1.5 py-px rounded leading-tight">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-[13px] font-mono font-semibold hidden sm:flex">
                        <span className="inline-flex items-center gap-1 text-bullish"><TrendingUp className="w-3 h-3" strokeWidth={2.25} />{bull}</span>
                        <span className="inline-flex items-center gap-1 text-bearish"><TrendingDown className="w-3 h-3" strokeWidth={2.25} />{bear}</span>
                        <span className="inline-flex items-center gap-1 text-neutral"><Minus className="w-3 h-3" strokeWidth={2.25} />{neut}</span>
                      </div>
                      <div className="w-16 text-right">
                        {outcome ? (
                          <span className={`text-[13px] font-mono font-bold ${outcomeColor(outcome.correct, outcome.total)}`}>
                            {outcome.correct}/{outcome.total}
                          </span>
                        ) : isToday ? (
                          <span className="text-[13px] font-mono font-medium text-muted">pending</span>
                        ) : (
                          <span className="text-[13px] font-mono font-medium text-muted">—</span>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
