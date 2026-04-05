import { InstrumentBias } from "@/types/bias";

export default function StatsPill({ instruments }: { instruments: InstrumentBias[] }) {
  const bull = instruments.filter((i) => i.daily_bias === "Bullish").length;
  const bear = instruments.filter((i) => i.daily_bias === "Bearish").length;
  const neut = instruments.filter((i) => i.daily_bias === "Neutral").length;
  const avgConf = instruments.reduce((s, i) => s + i.confidence, 0) / instruments.length;

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <div className="flex items-center gap-2 bg-bullish/10 border border-bullish/30 rounded-lg px-3 py-2">
        <span className="text-bullish text-sm font-bold">▲ {bull}</span>
        <span className="text-text-secondary text-xs">Bullish</span>
      </div>
      <div className="flex items-center gap-2 bg-bearish/10 border border-bearish/30 rounded-lg px-3 py-2">
        <span className="text-bearish text-sm font-bold">▼ {bear}</span>
        <span className="text-text-secondary text-xs">Bearish</span>
      </div>
      <div className="flex items-center gap-2 bg-neutral/10 border border-neutral/30 rounded-lg px-3 py-2">
        <span className="text-neutral text-sm font-bold">◆ {neut}</span>
        <span className="text-text-secondary text-xs">Neutral</span>
      </div>
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
        <span className="text-accent text-sm font-bold">{avgConf.toFixed(1)}/10</span>
        <span className="text-text-secondary text-xs">Avg confidence</span>
      </div>
    </div>
  );
}
