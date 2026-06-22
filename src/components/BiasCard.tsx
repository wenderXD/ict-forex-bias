"use client";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, Minus, ArrowRight, Check, X, MessagesSquare } from "lucide-react";
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

// Hairline column rule under the masthead, tinted to the verdict.
function biasRule(bias: BiasDirection) {
  if (bias === "Bullish") return "from-bullish/55";
  if (bias === "Bearish") return "from-bearish/55";
  return "from-neutral/55";
}

function pdColor(pd: string) {
  if (pd === "Premium") return "text-bearish";
  if (pd === "Discount") return "text-bullish";
  return "text-neutral";
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

/* Segmented conviction meter — quiet, not a hero metric */
function ConvictionMeter({ value }: { value: number }) {
  const filled = Math.round(value);
  const segColor =
    value >= 7 ? "bg-bullish" : value >= 5 ? "bg-accent/80" : "bg-neutral";
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-colors ${i < filled ? segColor : "bg-border"}`}
        />
      ))}
    </div>
  );
}

/* Broadsheet column-head: serif title + extending hairline rule + optional meta */
function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h3 className="display text-text-primary text-lg tracking-tight">{title}</h3>
      <div className="flex-1 h-px rule-fade" />
      {meta && <span className="text-muted text-xs font-mono font-semibold uppercase tracking-wider shrink-0">{meta}</span>}
    </div>
  );
}

/* Ledger row — aligned figures, no boxes */
function Ledger({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between items-baseline py-1.5 border-b border-border-soft/70"
        >
          <dt className="text-text-secondary text-[13px] font-medium">{label}</dt>
          <dd className="text-text-primary text-[13px] font-mono font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* The dealing-range ladder — the signature visual. Shows where current price
   sits between swing low and swing high, premium (sell) above equilibrium,
   discount (buy) below it. */
function RangeLadder({ data }: { data: InstrumentBias }) {
  const { swing_high: hi, swing_low: lo, equilibrium: eq, current_price: cur, premium_discount: pd } = data;
  const range = hi - lo;
  if (!(range > 0)) return null;

  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const topPct = (p: number) => `${clamp(1 - (p - lo) / range) * 100}%`;

  const status =
    pd === "Premium" ? t.premiumSell : pd === "Discount" ? t.discountBuy : t.equilibriumFair;

  return (
    <div className="flex gap-5">
      {/* Visual band */}
      <div className="relative w-16 shrink-0 h-[188px] rounded-md border border-border-soft overflow-hidden">
        {/* Premium (top) / discount (bottom) zones */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-bearish/[0.07]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-bullish/[0.07]" />
        {/* Zone labels */}
        <span className="absolute top-1.5 left-1.5 font-mono font-bold uppercase tracking-wider text-bearish/80 text-[10px] leading-none">Prem</span>
        <span className="absolute bottom-1.5 left-1.5 font-mono font-bold uppercase tracking-wider text-bullish/80 text-[10px] leading-none">Disc</span>
        {/* Equilibrium */}
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-accent/45 -translate-y-px" />
        {/* Current price marker */}
        <div
          className="absolute inset-x-0 flex items-center -translate-y-1/2"
          style={{ top: topPct(cur) }}
        >
          <div className="h-px flex-1 bg-accent" />
          <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_2px_rgb(var(--card))]" />
        </div>
      </div>

      {/* Ledger + status */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <dl className="space-y-0">
          {([
            [t.swingHigh, formatPrice(hi), "text-text-secondary"],
            [t.equilibrium, formatPrice(eq), "text-text-secondary"],
            [t.swingLow, formatPrice(lo), "text-text-secondary"],
          ] as const).map(([label, value, cls]) => (
            <div key={label} className="flex justify-between items-baseline py-1.5 border-b border-border-soft/70">
              <dt className={`text-[13px] font-medium ${cls}`}>{label}</dt>
              <dd className="text-text-primary text-[13px] font-mono font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between items-baseline pt-2">
            <dt className="text-accent text-[13px] font-semibold">{t.current}</dt>
            <dd className="text-accent text-[13px] font-mono tabular-nums font-bold">{formatPrice(cur)}</dd>
          </div>
        </dl>
        <p className={`text-xs font-mono font-semibold mt-2 ${pdColor(pd)}`}>{status}</p>
      </div>
    </div>
  );
}

export default function BiasCard({ data, outcome, date }: { data: InstrumentBias; outcome?: InstrumentOutcome; date: string }) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { open: openChat } = useChat();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tr = t;

  useEffect(() => setMounted(true), []);

  // Escape to close, lock background scroll, and trap + restore focus.
  useEffect(() => {
    if (!expanded) return;
    const opener = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog on open.
    closeRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [expanded]);

  const catKey   = CATEGORY[data.symbol] ?? "forex";
  const catLabel = tr[catKey];
  const fullName = FULL_NAME[data.symbol] ?? data.symbol;
  const dp = data.current_price < 10 ? 2 : data.current_price < 1000 ? 3 : 5;

  const biasLabel = (b: BiasDirection) =>
    b === "Bullish" ? tr.bullish : b === "Bearish" ? tr.bearish : tr.neutral;

  const pdLabel = (pd: string) =>
    pd === "Premium" ? tr.premium : pd === "Discount" ? tr.discount : tr.equilibriumBadge;

  const confLabel = data.confidence >= 7 ? tr.high : data.confidence >= 5 ? tr.moderate : tr.low;

  const open = () => setExpanded(true);

  return (
    <>
      {/* ── Collapsed card — a broadsheet clipping ───────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-label={`${data.symbol} — daily bias ${biasLabel(data.daily_bias)}. Open full analysis.`}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className="group flex flex-col h-full rounded-xl border border-border bg-card card-raise
                   p-5 cursor-pointer transition-[transform,background-color,border-color] duration-300
                   hover:-translate-y-0.5 hover:bg-card-hi hover:border-accent/30
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Masthead */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="dateline text-muted mb-1.5">{catLabel}</div>
            <div className="text-text-primary display text-[1.75rem] tracking-tight leading-none">
              {data.symbol}
            </div>
            <div className="serif italic text-text-secondary text-sm mt-1.5 truncate">{fullName}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="dateline text-muted mb-1">{tr.last}</div>
            <div className="text-text-secondary text-[15px] font-mono font-semibold tabular-nums">{data.current_price.toFixed(dp)}</div>
          </div>
        </div>

        {/* Verdict-tinted column rule */}
        <div className={`h-px my-4 bg-gradient-to-r ${biasRule(data.daily_bias)} to-transparent`} />

        {/* The verdict — the editorial call */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className={`display text-[2.35rem] leading-[0.92] font-extrabold tracking-tight ${biasTextColor(data.daily_bias)}`}>
              {biasLabel(data.daily_bias)}
            </div>
            <div className="dateline text-muted mt-1.5">{tr.dailyBias}</div>
          </div>
          <BiasIcon bias={data.daily_bias} className={`w-7 h-7 shrink-0 mb-1 ${biasTextColor(data.daily_bias)}`} />
        </div>

        {/* Byline — weekly read + zone */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-4 text-[13px] font-mono font-medium">
          <span className="text-text-secondary">
            {tr.weekly}{" "}
            <span className={`font-semibold ${biasTextColor(data.weekly_bias)}`}>{biasLabel(data.weekly_bias)}</span>
          </span>
          <span className="text-border" aria-hidden>·</span>
          <span className={pdColor(data.premium_discount)}>{pdLabel(data.premium_discount)}</span>
        </div>

        {/* Conviction */}
        <div className="mt-4">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="dateline text-muted">{tr.confidence}</span>
            <span className={`text-[13px] font-mono font-bold ${
              data.confidence >= 7 ? "text-bullish" : data.confidence >= 5 ? "text-accent" : "text-neutral"
            }`}>
              {data.confidence}/10 · {confLabel}
            </span>
          </div>
          <ConvictionMeter value={data.confidence} />
        </div>

        {/* Draw on liquidity — a margin note */}
        <div className="mt-4">
          <div className="dateline text-muted mb-1">{tr.drawOnLiquidity}</div>
          <p className="serif italic text-text-secondary text-[15px] leading-snug">{data.draw_on_liquidity}</p>
        </div>

        {/* Outcome (archive) */}
        {outcome && (
          <div className="mt-4 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded border ${
              outcome.correct
                ? "text-bullish border-bullish/30 bg-bullish/10"
                : "text-bearish border-bearish/30 bg-bearish/10"
            }`}>
              {outcome.correct ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <X className="w-3 h-3" strokeWidth={2.5} />}
              {outcome.correct ? "Correct" : "Missed"}
            </span>
            <span className="flex items-center gap-1 text-muted text-xs font-mono font-medium">
              <ArrowRight className="w-3 h-3" /> {outcome.nextPrice.toFixed(dp)}
            </span>
          </div>
        )}

        {/* Footer cue */}
        <div className="mt-auto pt-4 flex items-center gap-1.5 text-muted text-[13px] font-mono font-semibold group-hover:text-accent transition-colors">
          <span>{tr.readNote}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* ── Full analysis — overlay window (portal) ──────────────────────── */}
      {mounted && expanded && createPortal(
        <div
          className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-sm backdrop-in flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${data.symbol} — ${fullName} full analysis`}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(660px,100%)] max-h-[88vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden expand-in"
          >
            {/* Masthead header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border-soft shrink-0">
              <div className="min-w-0">
                <div className="dateline text-muted mb-1.5">{catLabel}</div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-text-primary display text-[1.75rem] leading-none tracking-tight">
                    {data.symbol}
                  </span>
                  <span className={`flex items-center gap-1.5 font-mono font-bold text-[15px] ${biasTextColor(data.daily_bias)}`}>
                    <BiasIcon bias={data.daily_bias} className="w-4 h-4" />
                    {biasLabel(data.daily_bias)}
                  </span>
                </div>
                <div className="serif italic text-text-secondary text-[15px] mt-1.5 truncate">{fullName}</div>
              </div>
              <button
                ref={closeRef}
                onClick={() => setExpanded(false)}
                aria-label="Close analysis"
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-border text-text-secondary
                           hover:border-accent/60 hover:text-accent transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable detail */}
            <div className="overflow-y-auto px-6 py-5 space-y-7">
              {/* Community */}
              <section className="section-rise" style={{ "--i": 0 } as CSSProperties}>
                <SectionHead title={tr.communityBias} meta={data.symbol} />
                <InstrumentVote date={date} symbol={data.symbol} />
                <button
                  type="button"
                  onClick={() => openChat(date, data.symbol)}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-mono font-semibold border border-accent/40 text-accent
                             rounded-lg py-2.5 hover:bg-accent/10 transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <MessagesSquare className="w-4 h-4" strokeWidth={2} />
                  {tr.openConversation}
                </button>
              </section>

              {/* Dealing range — signature visual */}
              <section className="section-rise" style={{ "--i": 1 } as CSSProperties}>
                <SectionHead title={tr.dealingRange} meta={pdLabel(data.premium_discount)} />
                <RangeLadder data={data} />
              </section>

              {/* Reference levels */}
              <section className="section-rise" style={{ "--i": 2 } as CSSProperties}>
                <SectionHead title={tr.referenceLevels} />
                <Ledger
                  rows={[
                    [tr.prevDayHigh, formatPrice(data.previous_day_high)],
                    [tr.prevWeekHigh, formatPrice(data.previous_week_high)],
                    [tr.prevDayLow, formatPrice(data.previous_day_low)],
                    [tr.prevWeekLow, formatPrice(data.previous_week_low)],
                  ]}
                />
              </section>

              {/* Market structure */}
              <section className="section-rise" style={{ "--i": 3 } as CSSProperties}>
                <SectionHead title={tr.marketStructure} />
                <p className="text-text-secondary text-[15px] leading-relaxed">{data.structure_label}</p>
                <p className="text-muted text-[13px] font-mono italic mt-1.5">{data.last_bos}</p>
              </section>

              {/* POI */}
              {(data.nearest_ob || data.nearest_fvg) && (
                <section className="section-rise" style={{ "--i": 4 } as CSSProperties}>
                  <SectionHead title={tr.keyPoi} />
                  <p className="text-text-secondary text-[15px] font-mono font-medium">{data.key_poi_label}</p>
                  <div className="mt-2 space-y-1">
                    {data.nearest_ob && (
                      <div className="flex justify-between text-[13px] font-mono tabular-nums border-b border-border-soft/70 py-1.5">
                        <span className="text-muted font-medium">{tr.orderBlock}</span>
                        <span className="text-text-secondary font-semibold">
                          {data.nearest_ob.low.toFixed(5)} – {data.nearest_ob.high.toFixed(5)}
                        </span>
                      </div>
                    )}
                    {data.nearest_fvg && (
                      <div className="flex justify-between text-[13px] font-mono tabular-nums py-1.5">
                        <span className="text-muted font-medium">{tr.fvg}</span>
                        <span className="text-text-secondary font-semibold">
                          {data.nearest_fvg.bottom.toFixed(5)} – {data.nearest_fvg.top.toFixed(5)} · CE {data.nearest_fvg.ce.toFixed(5)}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Liquidity */}
              {data.liquidity_levels.length > 0 && (
                <section className="section-rise" style={{ "--i": 5 } as CSSProperties}>
                  <SectionHead title={tr.liquidity} />
                  <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                    {data.liquidity_levels.slice(0, 8).map((l, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-baseline text-[13px] font-mono tabular-nums py-1.5 border-b border-border-soft/70"
                      >
                        <span className={`font-bold ${l.kind === "BSL" ? "text-bullish" : "text-bearish"}`}>
                          {l.kind}{l.equal ? "=" : ""}
                        </span>
                        <span className="text-text-secondary font-semibold">
                          {l.price.toFixed(l.price < 10 ? 2 : l.price < 1000 ? 3 : 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {data.liquidity_levels.some((l) => l.equal) && (
                    <p className="text-muted text-[13px] font-mono font-medium mt-2">{tr.eqNote}</p>
                  )}
                </section>
              )}

              {/* Narrative — the centerpiece */}
              <section className="section-rise" style={{ "--i": 6 } as CSSProperties}>
                <SectionHead title={tr.narrative} />
                <p className="dropcap text-text-primary text-base leading-relaxed">
                  {data.narrative}
                </p>
              </section>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
