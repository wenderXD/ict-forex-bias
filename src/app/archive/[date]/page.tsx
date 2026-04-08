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
          <p className="text-text-secondary text-sm font-mono mt-1.5">
            ICT / Smart Money framework · {bias.instruments.length} instruments
          </p>
        </div>

        <MarketOverview text={bias.market_overview} />
        <StatsPill instruments={bias.instruments} />
        <KillzoneTracker />
        <BiasGrid instruments={bias.instruments} />

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
