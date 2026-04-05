import { DailyBias } from "@/types/bias";
import Header from "@/components/Header";
import MarketOverview from "@/components/MarketOverview";
import BiasGrid from "@/components/BiasGrid";
import StatsPill from "@/components/StatsPill";
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">ICT</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">ICT Forex Bias</h1>
          <p className="text-text-secondary mb-6">
            No bias data yet. The first analysis will run automatically via GitHub Actions.
          </p>
          <div className="bg-card border border-border rounded-xl p-6 text-left max-w-md text-sm text-text-secondary space-y-2">
            <p className="font-semibold text-text-primary">Setup checklist:</p>
            <p>1. Push this repo to GitHub</p>
            <p>2. Connect to Vercel</p>
            <p>3. GitHub Actions will run at 06:00 UTC daily</p>
            <p>4. Or trigger it manually in the Actions tab</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header date={bias.date} generatedAt={bias.generated_at} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
            Daily Bias — {new Date(bias.date + "T12:00:00Z").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </h1>
          <p className="text-text-secondary text-sm">
            AI analysis based on ICT / Smart Money concepts. Click any card for full analysis.
          </p>
        </div>

        <MarketOverview text={bias.market_overview} />
        <StatsPill instruments={bias.instruments} />
        <BiasGrid instruments={bias.instruments} />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-muted text-xs space-y-1">
          <p>ICT Forex Bias — AI-generated analysis using Inner Circle Trader concepts.</p>
          <p>For educational purposes only. Not financial advice. Always do your own research.</p>
        </footer>
      </main>
    </div>
  );
}
