import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, Gauge } from "lucide-react";
import { InstrumentBias } from "@/types/bias";
import { t } from "@/lib/translations";

interface StatItemProps {
  label: string;
  value: string;
  icon: ReactNode;
  colorClass: string;
  isLast?: boolean;
}

function StatItem({ label, value, icon, colorClass, isLast }: StatItemProps) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 flex-1 justify-center sm:justify-start ${!isLast ? "border-r border-border-soft" : ""}`}>
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold text-2xl tabular-nums leading-none ${colorClass}`}>
        {icon}
        {value}
      </span>
      <span className="text-text-secondary text-[13px] font-mono font-semibold uppercase tracking-wider hidden sm:block">
        {label}
      </span>
      <span className="text-text-secondary text-[13px] font-mono font-semibold sm:hidden">
        {label}
      </span>
    </div>
  );
}

export default function StatsPill({ instruments }: { instruments: InstrumentBias[] }) {
  const tr = t;
  const bull = instruments.filter((i) => i.daily_bias === "Bullish").length;
  const bear = instruments.filter((i) => i.daily_bias === "Bearish").length;
  const neut = instruments.filter((i) => i.daily_bias === "Neutral").length;
  const avgConf = (
    instruments.reduce((s, i) => s + i.confidence, 0) / instruments.length
  ).toFixed(1);

  return (
    <div className="mb-8 border border-border rounded-xl bg-card card-raise overflow-hidden">
      <div className="flex flex-wrap">
        <StatItem label={tr.bullish}       value={`${bull}`}      icon={<TrendingUp className="w-4 h-4" strokeWidth={2.25} />}   colorClass="text-bullish" />
        <StatItem label={tr.bearish}       value={`${bear}`}      icon={<TrendingDown className="w-4 h-4" strokeWidth={2.25} />} colorClass="text-bearish" />
        <StatItem label={tr.neutral}       value={`${neut}`}      icon={<Minus className="w-4 h-4" strokeWidth={2.25} />}       colorClass="text-neutral" />
        <StatItem label={tr.avgConfidence} value={`${avgConf}/10`} icon={<Gauge className="w-4 h-4" strokeWidth={2.25} />}      colorClass="text-accent" isLast />
      </div>
    </div>
  );
}
