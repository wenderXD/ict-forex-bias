"use client";
import { useState } from "react";
import { InstrumentBias, BiasDirection } from "@/types/bias";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

const CATEGORY: Record<string, "forex" | "index" | "commodity"> = {
  EURUSD: "forex", GBPUSD: "forex", AUDUSD: "forex",
  NZDUSD: "forex", USDCAD: "forex", USDCHF: "forex", USDJPY: "forex",
  DXY: "index", SPX500: "index",
  XAUUSD: "commodity", XAGUSD: "commodity", USOIL: "commodity",
};

const FULL_NAME: Record<string, string> = {
  EURUSD: "Euro / US Dollar",     GBPUSD: "British Pound / US Dollar",
  AUDUSD: "Aussie / US Dollar",   NZDUSD: "Kiwi / US Dollar",
  USDCAD: "US Dollar / Canadian", USDCHF: "US Dollar / Swiss Franc",
  USDJPY: "US Dollar / Yen",      DXY: "US Dollar Index",
  SPX500: "S&P 500",              XAUUSD: "Gold / US Dollar",
  XAGUSD: "Silver / US Dollar",   USOIL: "Crude Oil (WTI)",
};

function biasColor(bias: BiasDirection) {
  if (bias === "Bullish") return "text-bullish";
  if (bias === "Bearish") return "text-bearish";
  return "text-neutral";
}
function biasBg(bias: BiasDirection) {
  if (bias === "Bullish") return "bg-bullish/10 border-bullish/30 glow-bullish";
  if (bias === "Bearish") return "bg-bearish/10 border-bearish/30 glow-bearish";
  return "bg-neutral/10 border-neutral/30 glow-neutral";
}
function biasArrow(bias: BiasDirection) {
  if (bias === "Bullish") return "▲";
  if (bias === "Bearish") return "▼";
  return "◆";
}

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const color = value >= 7 ? "bg-bullish" : value >= 5 ? "bg-accent" : "bg-neutral";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-text-secondary text-xs font-mono w-8 text-right">{value}/10</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  const dp = value < 10 ? 2 : value < 1000 ? 3 : 5;
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-text-primary text-xs font-mono">{value.toFixed(dp)}</span>
    </div>
  );
}

export default function BiasCard({ data }: { data: InstrumentBias }) {
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLang();
  const tr = t[lang];

  const catKey = CATEGORY[data.symbol] ?? "forex";
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
      className={`border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.01] ${biasBg(data.daily_bias)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-text-secondary text-xs">{catLabel}</span>
              <span className="text-border">•</span>
              <span className="text-text-secondary text-xs">{fullName}</span>
            </div>
            <div className="text-text-primary font-bold text-xl font-mono">{data.symbol}</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${biasColor(data.daily_bias)}`}>
              {biasArrow(data.daily_bias)} {biasLabel(data.daily_bias)}
            </div>
            <div className="text-text-secondary text-xs font-mono mt-0.5">
              {data.current_price.toFixed(dp)}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-text-secondary text-xs">{tr.confidence}</span>
            <span className={`text-xs font-medium ${data.confidence >= 7 ? "text-bullish" : data.confidence >= 5 ? "text-accent" : "text-neutral"}`}>
              {confLabel}
            </span>
          </div>
          <ConfidenceBar value={data.confidence} label={confLabel} />
        </div>

        <div className="flex gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${biasColor(data.weekly_bias)} border-current/30`}>
            W: {biasLabel(data.weekly_bias)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${biasColor(data.daily_bias)} border-current/30`}>
            D: {biasLabel(data.daily_bias)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            data.premium_discount === "Premium" ? "text-bearish border-bearish/30" :
            data.premium_discount === "Discount" ? "text-bullish border-bullish/30" :
            "text-neutral border-neutral/30"
          }`}>
            {pdLabel(data.premium_discount)}
          </span>
        </div>

        <div className="bg-background/50 rounded-lg px-3 py-2">
          <div className="text-muted text-xs mb-0.5">{tr.drawOnLiquidity}</div>
          <div className="text-text-secondary text-xs font-mono">{data.draw_on_liquidity}</div>
        </div>

        <div className="flex items-center justify-center mt-3 text-muted text-xs gap-1">
          <span>{expanded ? tr.hideAnalysis : tr.showAnalysis}</span>
          <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 p-4 sm:p-5 space-y-5" onClick={e => e.stopPropagation()}>
          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">{tr.keyLevels}</div>
            <div className="bg-background/50 rounded-lg p-3 space-y-0.5">
              <PriceRow label={tr.swingHigh}    value={data.swing_high} />
              <PriceRow label={tr.equilibrium}  value={data.equilibrium} />
              <PriceRow label={tr.swingLow}     value={data.swing_low} />
              <PriceRow label={tr.prevDayHigh}  value={data.previous_day_high} />
              <PriceRow label={tr.prevDayLow}   value={data.previous_day_low} />
              <PriceRow label={tr.prevWeekHigh} value={data.previous_week_high} />
              <PriceRow label={tr.prevWeekLow}  value={data.previous_week_low} />
            </div>
          </div>

          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">{tr.marketStructure}</div>
            <div className="bg-background/50 rounded-lg p-3 space-y-1.5">
              <div className="text-text-secondary text-xs">{data.structure_label}</div>
              <div className="text-text-secondary text-xs italic">{data.last_bos}</div>
            </div>
          </div>

          {(data.nearest_ob || data.nearest_fvg) && (
            <div>
              <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">{tr.keyPoi}</div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-text-secondary text-xs font-mono">{data.key_poi_label}</div>
                {data.nearest_ob && (
                  <div className="text-muted text-xs mt-1">
                    {tr.orderBlock}: {data.nearest_ob.low.toFixed(5)} – {data.nearest_ob.high.toFixed(5)}
                  </div>
                )}
                {data.nearest_fvg && (
                  <div className="text-muted text-xs mt-1">
                    {tr.fvg}: {data.nearest_fvg.bottom.toFixed(5)} – {data.nearest_fvg.top.toFixed(5)} | CE: {data.nearest_fvg.ce.toFixed(5)}
                  </div>
                )}
              </div>
            </div>
          )}

          {data.liquidity_levels.length > 0 && (
            <div>
              <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">{tr.liquidity}</div>
              <div className="grid grid-cols-2 gap-1">
                {data.liquidity_levels.slice(0, 8).map((l, i) => (
                  <div key={i} className={`text-xs px-2 py-1 rounded font-mono flex justify-between ${
                    l.kind === "BSL" ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
                  }`}>
                    <span>{l.kind}{l.equal ? "*" : ""}</span>
                    <span>{l.price.toFixed(l.price < 10 ? 2 : l.price < 1000 ? 3 : 5)}</span>
                  </div>
                ))}
              </div>
              <div className="text-muted text-xs mt-1">{tr.eqNote}</div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">{tr.narrative}</div>
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-text-secondary text-xs leading-relaxed">{narrative}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
