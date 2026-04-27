import { readFileSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DailyBias } from "@/types/bias";
import Header from "@/components/Header";
import MarketOverview from "@/components/MarketOverview";
import BiasGrid from "@/components/BiasGrid";
import StatsPill from "@/components/StatsPill";
import KillzoneTracker from "@/components/KillzoneTracker";

export type InstrumentOutcome = { correct: boolean; nextPrice: number };

function getBias(date: string): DailyBias | null {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "bias", `${date}.json`), "utf-8");
    return JSON.parse(raw) as DailyBias;
  } catch {
    return null;
  }
}

function getDateIndex(): string[] {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "bias", "index.json"), "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export const dynamicParams = false;

export function generateStaticParams() {
  const dates = getDateIndex();
  return dates.map((date) => ({ date }));
}

export default async function ArchiveDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const bias = getBias(date);
  if (!bias) notFound();

  // Load next trading day's file to evaluate prediction outcomes
  const dates = getDateIndex();
  const currentIdx = dates.indexOf(date);
  const nextDate = currentIdx > 0 ? dates[currentIdx - 1] : null;
  const nextBias = nextDate ? getBias(nextDate) : null;

  const outcomes: Record<string, InstrumentOutcome> = {};
  if (nextBias) {
    for (const inst of bias.instruments) {
      if (inst.daily_bias === "Neutral") continue;
      const next = nextBias.instruments.find((n) => n.symbol === inst.symbol);
      if (!next || inst.current_price == null || next.current_price == null) continue;
      if (inst.current_price === next.current_price) continue;
      const priceRose = next.current_price > inst.current_price;
      const correct =
        (inst.daily_bias === "Bullish" && priceRose) ||
        (inst.daily_bias === "Bearish" && !priceRose);
      outcomes[inst.symbol] = { correct, nextPrice: next.current_price };
    }
  }

  const hasOutcomes = Object.keys(outcomes).length > 0;
  const correctCount = Object.values(outcomes).filter((o) => o.correct).length;
  const totalCount = Object.keys(outcomes).length;

  const dateDisplay = new Date(bias.date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen">
      <Header date={bias.date} generatedAt={bias.generated_at} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <Link
            href="/archive/"
            className="text-muted text-xs font-mono hover:text-text-secondary transition-colors inline-flex items-center gap-1.5 mb-4"
          >
            <span>←</span>
            <span>Back to archive</span>
          </Link>
          <p className="text-muted text-xs font-mono uppercase tracking-[0.18em] mb-1.5">
            Archived Analysis
          </p>
          <h1 className="text-2xl sm:text-3xl font-mono font-semibold text-text-primary">
            {dateDisplay}
          </h1>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <p className="text-text-secondary text-sm font-mono">
              ICT / Smart Money framework · {bias.instruments.length} instruments
            </p>
            {hasOutcomes && (
              <p className={`text-sm font-mono ${
                correctCount / totalCount >= 0.67 ? "text-bullish"
                : correctCount / totalCount >= 0.5  ? "text-neutral"
                : "text-bearish"
              }`}>
                {correctCount}/{totalCount} correct
              </p>
            )}
          </div>
        </div>

        <MarketOverview text={bias.market_overview} />
        <StatsPill instruments={bias.instruments} />
        <KillzoneTracker />
        <BiasGrid instruments={bias.instruments} outcomes={outcomes} />

        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
            <span className="text-xs font-mono text-muted">
              ICT Forex Bias · AI-generated analysis using Inner Circle Trader concepts
            </span>
            <span className="text-xs font-mono text-muted">
              Educational only · Not financial advice
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
