import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
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

function BiasIndicator({ bias }: { bias: string }) {
  if (bias === "Bullish") return <span className="text-bullish text-xs">▲</span>;
  if (bias === "Bearish") return <span className="text-bearish text-xs">▼</span>;
  return <span className="text-neutral text-xs">◆</span>;
}

export default function ArchivePage() {
  const dates = getDateIndex();
  const today = dates[0] ?? new Date().toISOString().split("T")[0];
  const latestBias = getBias(today);

  return (
    <div className="min-h-screen">
      <Header date={today} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="text-muted text-sm hover:text-text-secondary mb-4 inline-block">
            ← Back to today
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Archive</h1>
          <p className="text-text-secondary text-sm">Historical daily bias records.</p>
        </div>

        {dates.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-text-secondary">
            No historical data yet. Check back after the first automated run.
          </div>
        ) : (
          <div className="space-y-2">
            {dates.map((date) => {
              const bias = getBias(date);
              const bullCount = bias?.instruments.filter(i => i.daily_bias === "Bullish").length ?? 0;
              const bearCount = bias?.instruments.filter(i => i.daily_bias === "Bearish").length ?? 0;
              const neuCount  = (bias?.instruments.length ?? 0) - bullCount - bearCount;
              const formattedDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
                weekday: "short", year: "numeric", month: "short", day: "numeric",
              });

              return (
                <Link
                  key={date}
                  href={`/archive/${date}/`}
                  className="flex items-center justify-between bg-card border border-border hover:border-accent/40 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary text-sm font-medium group-hover:text-accent transition-colors">
                      {formattedDate}
                    </span>
                    {date === today && (
                      <span className="text-xs bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-bullish font-mono">▲ {bullCount}</span>
                    <span className="text-bearish font-mono">▼ {bearCount}</span>
                    <span className="text-neutral font-mono">◆ {neuCount}</span>
                    <span className="text-muted">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
