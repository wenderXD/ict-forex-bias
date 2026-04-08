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

export default function ArchivePage() {
  const dates = getDateIndex();
  const today = dates[0] ?? new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen">
      <Header date={today} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-muted text-xs font-mono hover:text-text-secondary transition-colors inline-flex items-center gap-1.5 mb-4"
          >
            <span>←</span>
            <span>Back to today</span>
          </Link>
          <p className="text-muted text-xs font-mono uppercase tracking-[0.18em] mb-1.5">
            Historical Records
          </p>
          <h1 className="text-2xl sm:text-3xl font-mono font-semibold text-text-primary">
            Archive
          </h1>
          <p className="text-text-secondary text-sm font-mono mt-1.5">
            {dates.length} session{dates.length !== 1 ? "s" : ""} recorded
          </p>
        </div>

        {dates.length === 0 ? (
          <div className="border border-border rounded-lg p-8 text-center bg-card">
            <p className="text-text-secondary font-mono text-sm">
              No historical data yet.
            </p>
            <p className="text-muted font-mono text-xs mt-1">
              Check back after the first automated run.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
              <span className="text-muted text-xs font-mono uppercase tracking-wider">Date</span>
              <div className="flex items-center gap-6">
                <span className="text-muted text-xs font-mono uppercase tracking-wider">Bias summary</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/60">
              {dates.map((date, idx) => {
                const bias = getBias(date);
                const bull = bias?.instruments.filter((i) => i.daily_bias === "Bullish").length ?? 0;
                const bear = bias?.instruments.filter((i) => i.daily_bias === "Bearish").length ?? 0;
                const neut = (bias?.instruments.length ?? 0) - bull - bear;

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
                      <span className="text-text-primary text-sm font-mono group-hover:text-accent transition-colors">
                        {formattedDate}
                      </span>
                      {isToday && (
                        <span className="text-xs font-mono bg-accent/15 text-accent border border-accent/30 px-1.5 py-px rounded leading-tight">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-bullish">▲&nbsp;{bull}</span>
                        <span className="text-bearish">▼&nbsp;{bear}</span>
                        <span className="text-neutral">◆&nbsp;{neut}</span>
                      </div>
                      <span className="text-muted text-xs font-mono group-hover:text-accent transition-colors">
                        →
                      </span>
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
