"use client";
import { InstrumentBias } from "@/types/bias";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

interface StatItemProps {
  label: string;
  value: string;
  colorClass: string;
  isLast?: boolean;
}

function StatItem({ label, value, colorClass, isLast }: StatItemProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-r border-border" : ""}`}>
      <span className={`font-mono font-semibold text-base leading-none ${colorClass}`}>
        {value}
      </span>
      <span className="text-text-secondary text-xs font-mono uppercase tracking-wider hidden sm:block">
        {label}
      </span>
      <span className="text-text-secondary text-xs font-mono sm:hidden">
        {label}
      </span>
    </div>
  );
}

export default function StatsPill({ instruments }: { instruments: InstrumentBias[] }) {
  const { lang } = useLang();
  const tr = t[lang];
  const bull = instruments.filter((i) => i.daily_bias === "Bullish").length;
  const bear = instruments.filter((i) => i.daily_bias === "Bearish").length;
  const neut = instruments.filter((i) => i.daily_bias === "Neutral").length;
  const avgConf = (
    instruments.reduce((s, i) => s + i.confidence, 0) / instruments.length
  ).toFixed(1);

  return (
    <div className="mb-8 border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex flex-wrap">
        <StatItem label={tr.bullish}       value={`▲ ${bull}`}        colorClass="text-bullish" />
        <StatItem label={tr.bearish}       value={`▼ ${bear}`}        colorClass="text-bearish" />
        <StatItem label={tr.neutral}       value={`◆ ${neut}`}        colorClass="text-neutral" />
        <StatItem label={tr.avgConfidence} value={`${avgConf}/10`}    colorClass="text-accent" isLast />
      </div>
    </div>
  );
}
