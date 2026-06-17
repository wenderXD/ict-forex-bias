"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, Minus, ArrowRight, ChevronDown, Check, X, MessagesSquare } from "lucide-react";
import { InstrumentBias, BiasDirection } from "@/types/bias";
import { InstrumentOutcome } from "@/app/archive/[date]/page";
import { t } from "@/lib/translations";
import { useChat } from "@/lib/ChatContext";
import InstrumentVote from "./InstrumentVote";

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

function BiasIcon({ bias, className }: { bias: BiasDirection; className?: string }) {
  if (bias === "Bullish") return <TrendingUp className={className} strokeWidth={2.25} />;
  if (bias === "Bearish") return <TrendingDown className={className} strokeWidth={2.25} />;
  return <Minus className={className} strokeWidth={2.25} />;
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

export default function BiasCard({ data, outcome, date }: { data: InstrumentBias; outcome?: InstrumentOutcome; date: string }) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { open: openChat } = useChat();
  const tr = t;

  useEffect(() => setMounted(true), []);

  // Close on Escape and lock background scroll while the overlay is open.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  const catKey  = CATEGORY[data.symbol] ?? "forex";
  const catLabel = tr[catKey];
  const fullName = FULL_NAME[data.symbol] ?? data.symbol;
  const dp = data.current_price < 10 ? 2 : data.current_price < 1000 ? 3 : 5;

  const biasLabel = (b: BiasDirection) =>
    b === "Bullish" ? tr.bullish : b === "Bearish" ? tr.bearish : tr.neutral;

  const pdLabel = (pd: string) =>
    pd === "Premium" ? tr.premium : pd === "Discount" ? tr.discount : tr.equilibriumBadge;

  const confLabel = data.confidence >= 7 ? tr.high : data.confidence >= 5 ? tr.moderate : tr.low;
  const narrative = data.narrative;

  return (
    <>
    <div
      className={`
        group border rounded-xl overflow-hidden bg-card card-raise cursor-pointer
        transition-all duration-300
        hover:-translate-y-0.5 hover:bg-card-hi
        ${biasBorder(data.daily_bias, expanded)}
      `}
      onClick={() => setExpanded(true)}
    >
      {/* Layout: left accent bar + content */}
      <div className="flex min-h-0">
        {/* Left color bar */}
        <div className={`w-1 flex-shrink-0 ${biasBarBg(data.daily_bias)} opacity-80 group-hover:opacity-100 transition-opacity`} />

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
                <div className={`flex items-center justify-end gap-1.5 font-mono font-semibold text-base leading-none mb-1.5 ${biasTextColor(data.daily_bias)}`}>
                  <BiasIcon bias={data.daily_bias} className="w-4 h-4" />
                  {biasLabel(data.daily_bias)}
                </div>
                <div className="text-text-secondary text-xs font-mono">
                  {data.current_price.toFixed(dp)}
                </div>
                {outcome && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded border ${
                      outcome.correct
                        ? "text-bullish border-bullish/30 bg-bullish/10"
                        : "text-bearish border-bearish/30 bg-bearish/10"
                    }`}>
                      {outcome.correct
                        ? <Check className="w-3 h-3" strokeWidth={2.5} />
                        : <X className="w-3 h-3" strokeWidth={2.5} />}
                      {outcome.correct ? "Correct" : "Missed"}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-muted text-[10px] font-mono mt-1">
                      <ArrowRight className="w-2.5 h-2.5" /> {outcome.nextPrice.toFixed(dp)}
                    </div>
                  </div>
                )}
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
              <span className="flex items-center gap-1 text-muted text-xs font-mono shrink-0 pt-px">
                DOL <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-text-secondary text-xs font-mono leading-relaxed">
                {data.draw_on_liquidity}
              </span>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-center mt-3 gap-1.5 text-muted text-xs group-hover:text-accent transition-colors">
              <span className="font-mono">{tr.showAnalysis}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Full analysis — overlay window (portal) so the card grid stays neutral */}
    {mounted && expanded && createPortal(
      <>
        <div
          className="fixed inset-0 z-[65] bg-black/50 backdrop-blur-sm backdrop-in flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
        <div
          role="dialog"
          aria-label={`${data.symbol} full analysis`}
          onClick={(e) => e.stopPropagation()}
          className="w-[min(640px,100%)] max-h-[88vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden expand-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-1 h-9 rounded-full shrink-0 ${biasBarBg(data.daily_bias)}`} />
              <div className="min-w-0">
                <div className="text-text-primary font-mono font-semibold text-xl leading-none">
                  {data.symbol}
                </div>
                <div className="text-text-secondary text-xs mt-1 truncate">{fullName}</div>
              </div>
              <div className={`flex items-center gap-1.5 font-mono font-semibold text-sm ml-1 ${biasTextColor(data.daily_bias)}`}>
                <BiasIcon bias={data.daily_bias} className="w-4 h-4" />
                {biasLabel(data.daily_bias)}
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close analysis"
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded border border-border text-text-secondary hover:border-accent/60 hover:text-accent transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable detail */}
          <div className="overflow-y-auto p-5 space-y-5">
              {/* Community vote — surfaced first */}
              <section>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Minus className="w-3 h-3 text-accent/60" strokeWidth={2.5} />
                  <span>Community Bias · {data.symbol}</span>
                </div>
                <div className="bg-surface rounded p-3">
                  <InstrumentVote date={date} symbol={data.symbol} />
                </div>
              </section>

              {/* Discussion — opens in the right-side drawer */}
              <section>
                <button
                  type="button"
                  onClick={() => openChat(date, data.symbol)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-mono border border-accent/40 text-accent rounded-lg py-2.5 hover:bg-accent/10 transition-colors"
                >
                  <MessagesSquare className="w-4 h-4" strokeWidth={2} />
                  Open conversation · {data.symbol}
                </button>
              </section>

              {/* Key Levels */}
              <section>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Minus className="w-3 h-3 text-accent/60" strokeWidth={2.5} />
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
                  <Minus className="w-3 h-3 text-accent/60" strokeWidth={2.5} />
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
                    <Minus className="w-3 h-3 text-accent/60" strokeWidth={2.5} />
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
                    <Minus className="w-3 h-3 text-accent/60" strokeWidth={2.5} />
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
                  <Minus className="w-3 h-3 text-accent/60" strokeWidth={2.5} />
                  <span>{tr.narrative}</span>
                </div>
                <div className="bg-surface rounded p-4">
                  <p className="serif italic text-text-secondary text-sm leading-relaxed">
                    {narrative}
                  </p>
                </div>
              </section>
          </div>
        </div>
        </div>
      </>,
      document.body
    )}
    </>
  );
}
