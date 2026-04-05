import { readFileSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DailyBias } from "@/types/bias";
import Header from "@/components/Header";
import MarketOverview from "@/components/MarketOverview";
import BiasGrid from "@/components/BiasGrid";
import StatsPill from "@/components/StatsPill";

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

export default async function ArchiveDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const bias = getBias(date);
  if (!bias) notFound();

  return (
    <div className="min-h-screen">
      <Header date={bias.date} generatedAt={bias.generated_at} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/archive/" className="text-muted text-sm hover:text-text-secondary mb-4 inline-block">
            ← Back to archive
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
            Bias — {new Date(bias.date + "T12:00:00Z").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </h1>
        </div>
        <MarketOverview text={bias.market_overview} />
        <StatsPill instruments={bias.instruments} />
        <BiasGrid instruments={bias.instruments} />
      </main>
    </div>
  );
}
