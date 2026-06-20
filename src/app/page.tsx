import { DailyBias } from "@/types/bias";
import Header from "@/components/Header";
import MarketOverview from "@/components/MarketOverview";
import BiasGrid from "@/components/BiasGrid";
import StatsPill from "@/components/StatsPill";
import KillzoneTracker from "@/components/KillzoneTracker";
import NewsBlock from "@/components/NewsBlock";
import RiskWarning from "@/components/RiskWarning";
import { readFileSync } from "fs";
import { join } from "path";

function getLatestBias(): DailyBias | null {
  try {
    const filePath = join(process.cwd(), "data", "bias", "latest.json");
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DailyBias;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const bias = getLatestBias();

  if (!bias) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="font-mono font-semibold text-xl text-text-primary mb-3">
            ICT<span className="text-accent">.</span>
          </div>
          <h1 className="display text-3xl font-medium text-text-primary mb-2">
            Awaiting first run
          </h1>
          <p className="text-text-secondary text-sm font-mono mb-7">
            No data yet. Automation runs at 06:00 UTC on weekdays.
          </p>
          <div className="border border-border rounded-xl p-5 text-left bg-card card-raise">
            <p className="text-text-primary font-mono text-xs font-semibold mb-3 uppercase tracking-wider">
              Setup checklist
            </p>
            <div className="space-y-2">
              {[
                "Push this repo to GitHub",
                "Connect to Vercel",
                "GitHub Actions runs at 06:00 UTC daily",
                "Or trigger manually in Actions tab",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-accent font-mono text-xs shrink-0 pt-px">
                    0{i + 1}
                  </span>
                  <span className="text-text-secondary font-mono text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateDisplay = new Date(bias.date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      <Header date={bias.date} generatedAt={bias.generated_at} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Page header */}
        <div className="mb-10 sm:mb-12">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-px w-8 rule-fade" />
            <p className="text-accent text-xs font-mono uppercase tracking-[0.22em]">
              Daily Analysis
            </p>
          </div>
          <h1 className="display text-4xl sm:text-5xl lg:text-[3.4rem] font-medium text-text-primary leading-[1.05]">
            {dateDisplay}
          </h1>
          <p className="text-text-secondary text-sm font-mono mt-3">
            ICT / Smart Money framework&nbsp;·&nbsp;{bias.instruments.length} instruments
          </p>
        </div>

        <RiskWarning />
        <MarketOverview text={bias.market_overview} />
        <StatsPill instruments={bias.instruments} />
        <KillzoneTracker />
        <NewsBlock />
        <BiasGrid instruments={bias.instruments} date={bias.date} />

        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
            <span className="text-xs font-mono text-muted">
              ICT Forex Bias · automated analysis using Inner Circle Trader concepts
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
