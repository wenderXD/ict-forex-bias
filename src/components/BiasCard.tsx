"use client";
import { useState } from "react";
import { InstrumentBias, BiasDirection } from "@/types/bias";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

const CATEGORY: Record<string, "forex" | "index" | "commodity"> = {
  EURUSD: "forex",  GBPUSD: "forex",  AUDUSD: "forex",
  NZDUSD: "forex",  USDCAD: "forex",  USDCHF: "forex",  USDJPY: "forex",
  DXY: "index",     SPX500: "index",
  XAUUSD: "commodity", XAGUSD: "commodity", USOIL: "commodity",
};

const FULL_NAME: Record<string, string> = {
  EURUSD: "Euro / US Dollar",       GBPUSD: "British Pound / USD",
  AUDUSD: "Australian Dollar",      NZDUSD: "New Zealand Dollar",
  USDCAD: "USD / Canadian Dollar",  USDCHF: "USD / Swiss Franc",
  USDJPY: "USD / Japanese Yen",     DXY: "US Dollar Index",
  SPX500: "S&P 500 Index",          XAUUSD: "Gold",
  XAGUSD: "Silver",                 USOIL: "Crude Oil WTI",
};

function biasTextColor(bias: BiasDirection) {
  if (bias === "Bullish") return "text-bullish";
  if (bias === "Bearish") return "text-bearish";
  return "text-neutral";
}

function biasBarBg(bias: BiasDirection) {
  if (bias === "Bullish") return "bg-bullish";
  if (bias === "Bearish") return "bg-bearish";
  return "bg-neutral";
}

function biasBorder(bias: BiasDirection, expanded: boolean) {
  if (!expanded) return "border-border";
  if (bias === "Bullish") return "border-bullish/35";
  if (bias === "Bearish") return "border-bearish/35";
  return "border-neutral/35";
}

function biasTagBorder(bias: BiasDirection) {
  if (bias === "Bullish") return "border-bullish/30 text-bullish";
  if (bias === "Bearish") return "border-bearish/30 text-bearish";
  return "border-neutral/30 text-neutral";
}

function biasArrow(bias: BiasDirection) {
  if (bias === "Bullish") return "▲";
  if (bias === "Bearish") return "▼";
  return "◆";
}

function formatPrice(price: number): string {
  if (price < 10)   return price.toFixed(2);
  if (price < 1000) return price.toFixed(3);
  return price.toFixed(5);
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value);
  const segColor =
    value >= 7 ? "bg-bullish" : value >= 5 ? "bg-accent/80" : "bg-neutral";

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-all ${
            i < filled ? segColor : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-text-primary text-xs font-mono">{value}</span>
    </div>
  );
}

export default function BiasCard({ data }: { data: InstrumentBias }) {
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLang();
  const tr = t[lang];

  const catKey  = CATEGORY[data.symbol] ?? "forex";
  const catLabel = tr[catKey];
  const fullName = FULL_NAME[data.symbol] ?? data.symbol;
  const dp = data.current_price < 10 ? 2 : data.current_price < 1000 ? 3 : 5;

  const biasLabel = (b: BiasDirection) =>
    b === "Bullish" ? tr.bullish : b === "Bearish" ? tr.bearish : tr.neutral;

  const pdLabel = (pd: string) =>
    pd === "Premium" ? tr.premium : pd === "Discount" ? tr.discount : tr.equilibriumBadge;

  const confLabel = data.confidence >= 7 ? tr.high : data.confidence >= 5 ? tr.moderate : tr.low;
  const narrative = lang === "ru" && data.narrative_ru ? data.narrative_ru : data.narrative;

  return (
    <div
      className={`
        border rounded-lg overflow-hidden bg-card cursor-pointer
        transition-all duration-200
        hover:bg-card/70
        ${biasBorder(data.daily_bias, expanded)}
      `}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Layout: left accent bar + content */}
      <div className="flex min-h-0">
        {/* Left color bar */}
        <div className={`w-[3px] flex-shrink-0 ${biasBarBg(data.daily_bias)}`} />

        <div className="flex-1 min-w-0">
          {/* Card body */}
          <div className="p-4">
            {/* Symbol + bias */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-muted text-xs font-mono uppercase tracking-wider mb-1">
                  {catLabel}
                </div>
                <div className="text-text-primary font-mono font-semibold text-2xl tracking-tight leading-none">
                  {data.symbol}
                </div>
                <div className="text-text-secondary text-xs mt-1">{fullName}</div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <div className={`font-mono font-semibold text-base leading-none mb-1.5 ${biasTextColor(data.daily_bias)}`}>
                  {biasArrow(data.daily_bias)}&nbsp;{biasLabel(data.daily_bias)}
                </div>
                <div className="text-text-secondary text-xs font-mono">
                  {data.current_price.toFixed(dp)}
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-muted text-xs font-mono">{tr.confidence}</span>
                <span className={`text-xs font-mono font-medium ${
                  data.confidence >= 7 ? "text-bullish"
                  : data.confidence >= 5 ? "text-accent"
                  : "text-neutral"
                }`}>
                  {data.confidence}/10 · {confLabel}
                </span>
              </div>
              <ConfidenceBar value={data.confidence} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className={`text-xs px-2 py-0.5 rounded font-mono border bg-surface ${biasTagBorder(data.weekly_bias)}`}>
                W&nbsp;{biasLabel(data.weekly_bias)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono border bg-surface ${biasTagBorder(data.daily_bias)}`}>
                D&nbsp;{biasLabel(data.daily_bias)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono border bg-surface ${
                data.premium_discount === "Premium"
                  ? "text-bearish border-bearish/30"
                  : data.premium_discount === "Discount"
                  ? "text-bullish border-bullish/30"
                  : "text-neutral border-neutral/30"
              }`}>
                {pdLabel(data.premium_discount)}
              </span>
            </div>

            {/* Draw on Liquidity */}
            <div className="bg-surface rounded px-3 py-2 flex items-start gap-2.5">
              <span className="text-muted text-xs font-mono shrink-0 pt-px">DOL →</span>
              <span className="text-text-secondary text-xs font-mono leading-relaxed">
                {data.draw_on_liquidity}
              </span>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-center mt-3 gap-1.5 text-muted text-xs">
              <span className="font-mono">
                {expanded ? tr.hideAnalysis : tr.showAnalysis}
              </span>
              <span
                className="inline-block transition-transform duration-200 font-mono text-[10px]"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▾
              </span>
            </div>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div
              className="border-t border-border/60 p-4 space-y-5 expand-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Key Levels */}
              <section>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-accent/60">—</span>
                  <span>{tr.keyLevels}</span>
                </div>
                <div className="bg-surface rounded p-3">
                  <DataRow label={tr.swingHigh}    value={formatPrice(data.swing_high)} />
                  <DataRow label={tr.equilibrium}  value={formatPrice(data.equilibrium)} />
                  <DataRow label={tr.swingLow}     value={formatPrice(data.swing_low)} />
                  <DataRow label={tr.prevDayHigh}  value={formatPrice(data.previous_day_high)} />
                  <DataRow label={tr.prevDayLow}   value={formatPrice(data.previous_day_low)} />
                  <DataRow label={tr.prevWeekHigh} value={formatPrice(data.previous_week_high)} />
                  <DataRow label={tr.prevWeekLow}  value={formatPrice(data.previous_week_low)} />
                </div>
              </section>

              {/* Market Structure */}
              <section>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-accent/60">—</span>
                  <span>{tr.marketStructure}</span>
                </div>
                <div className="bg-surface rounded p-3 space-y-1.5">
                  <div className="text-text-secondary text-xs">{data.structure_label}</div>
                  <div className="text-muted text-xs font-mono italic">{data.last_bos}</div>
                </div>
              </section>

              {/* POI */}
              {(data.nearest_ob || data.nearest_fvg) && (
                <section>
                  <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="text-accent/60">—</span>
                    <span>{tr.keyPoi}</span>
                  </div>
                  <div className="bg-surface rounded p-3 space-y-1.5">
                    <div className="text-text-secondary text-xs font-mono">
                      {data.key_poi_label}
                    </div>
                    {data.nearest_ob && (
                      <div className="text-muted text-xs font-mono">
                        OB: {data.nearest_ob.low.toFixed(5)} – {data.nearest_ob.high.toFixed(5)}
                      </div>
                    )}
                    {data.nearest_fvg && (
                      <div className="text-muted text-xs font-mono">
                        FVG: {data.nearest_fvg.bottom.toFixed(5)} – {data.nearest_fvg.top.toFixed(5)} &nbsp;·&nbsp; CE: {data.nearest_fvg.ce.toFixed(5)}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Liquidity */}
              {data.liquidity_levels.length > 0 && (
                <section>
                  <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="text-accent/60">—</span>
                    <span>{tr.liquidity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {data.liquidity_levels.slice(0, 8).map((l, i) => (
                      <div
                        key={i}
                        className={`text-xs px-2.5 py-1.5 rounded font-mono flex justify-between items-center border ${
                          l.kind === "BSL"
                            ? "bg-bullish/8 text-bullish border-bullish/20"
                            : "bg-bearish/8 text-bearish border-bearish/20"
                        }`}
                      >
                        <span className="font-medium">{l.kind}{l.equal ? "=" : ""}</span>
                        <span>
                          {l.price.toFixed(l.price < 10 ? 2 : l.price < 1000 ? 3 : 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {data.liquidity_levels.some((l) => l.equal) && (
                    <div className="text-muted text-xs font-mono mt-1.5">{tr.eqNote}</div>
                  )}
                </section>
              )}

              {/* Narrative */}
              <section>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-accent/60">—</span>
                  <span>{tr.narrative}</span>
                </div>
                <div className="bg-surface rounded p-4">
                  <p className="serif italic text-text-secondary text-sm leading-relaxed">
                    {narrative}
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
