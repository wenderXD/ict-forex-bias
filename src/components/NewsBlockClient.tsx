"use client";
import { useEffect, useState } from "react";
import { Newspaper, Info, Filter, Globe, Coins, Settings } from "lucide-react";
import type { NewsEvent, NewsImpact } from "@/lib/news";

const TIMEZONES: { id: string; label: string }[] = [
  { id: "America/New_York", label: "New York (ET)" },
  { id: "America/Chicago",  label: "Chicago (CT)" },
  { id: "Europe/London",    label: "London (GMT/BST)" },
  { id: "Europe/Berlin",    label: "Frankfurt (CET)" },
  { id: "Asia/Tokyo",       label: "Tokyo (JST)" },
  { id: "Asia/Shanghai",    label: "Shanghai (CST)" },
  { id: "Australia/Sydney", label: "Sydney (AET)" },
  { id: "UTC",              label: "UTC" },
];

const ALL_IMPACTS: NewsImpact[] = ["High", "Medium", "Low"];

function impactClasses(impact: NewsImpact): string {
  if (impact === "High")   return "text-bearish border-bearish/30 bg-bearish/10";
  if (impact === "Medium") return "text-neutral border-neutral/30 bg-neutral/10";
  return "text-text-secondary border-border bg-surface";
}

function chipClasses(impact: NewsImpact, active: boolean): string {
  if (!active) return "text-muted border-border hover:border-accent/50";
  if (impact === "High")   return "text-bearish border-bearish/40 bg-bearish/10";
  if (impact === "Medium") return "text-neutral border-neutral/40 bg-neutral/10";
  return "text-text-primary border-text-secondary/40 bg-surface";
}

function fmtTime(ts: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(ts));
  } catch {
    return "--:--";
  }
}

function fmtDay(ts: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", month: "short", day: "numeric",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

// Sortable YYYYMMDD for a timestamp in a given timezone — used to keep only
// today and later.
function dayNum(ts: number, tz: string): number {
  try {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(ts));
    const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
    return Number(`${get("year")}${get("month")}${get("day")}`);
  } catch {
    return 0;
  }
}

export default function NewsBlockClient({ events }: { events: NewsEvent[] }) {
  const currencies = Array.from(new Set(events.map((e) => e.currency)));

  const [tz, setTz] = useState("America/New_York");
  const [enabled, setEnabled] = useState<Record<NewsImpact, boolean>>({
    High: true,
    Medium: true,
    Low: false,
  });
  const [enabledCcy, setEnabledCcy] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // default: all currencies on
    setEnabledCcy(Object.fromEntries(currencies.map((c) => [c, true])));
    try {
      const savedTz = localStorage.getItem("news.tz");
      if (savedTz && TIMEZONES.some((z) => z.id === savedTz)) setTz(savedTz);
      const savedImp = localStorage.getItem("news.impacts");
      if (savedImp) setEnabled((e) => ({ ...e, ...JSON.parse(savedImp) }));
      const savedCcy = localStorage.getItem("news.currencies");
      if (savedCcy) setEnabledCcy((c) => ({ ...Object.fromEntries(currencies.map((x) => [x, true])), ...JSON.parse(savedCcy) }));
    } catch {
      /* ignore */
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("news.tz", tz);
      localStorage.setItem("news.impacts", JSON.stringify(enabled));
      localStorage.setItem("news.currencies", JSON.stringify(enabledCcy));
    } catch {
      /* ignore */
    }
  }, [tz, enabled, enabledCcy, mounted]);

  const toggle = (i: NewsImpact) => setEnabled((e) => ({ ...e, [i]: !e[i] }));
  const toggleCcy = (c: string) => setEnabledCcy((s) => ({ ...s, [c]: !s[c] }));

  // Start the calendar at today (in the selected timezone). Gated behind
  // `mounted` so SSR and first client render match (both show the full week),
  // then it trims to today+ once hydrated.
  const todayNum = dayNum(Date.now(), tz);
  const visible = events.filter(
    (e) =>
      enabled[e.impact] &&
      enabledCcy[e.currency] !== false &&
      (!mounted || dayNum(e.ts, tz) >= todayNum)
  );

  return (
    <div className="mb-8 border border-border rounded-xl bg-card card-raise overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
          <span className="text-accent text-[13px] font-mono uppercase tracking-[0.2em] font-bold">
            Economic Calendar
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted text-[13px] font-mono font-semibold">{visible.length} events</span>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Calendar settings"
            aria-expanded={showSettings}
            title="Filters & timezone"
            className={`flex items-center justify-center h-6 w-6 rounded border transition-colors ${
              showSettings
                ? "border-accent/60 text-accent bg-accent/10"
                : "border-border text-text-secondary hover:border-accent/50 hover:text-accent"
            }`}
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Settings / controls */}
      {showSettings && (
        <div className="px-5 py-3 border-b border-border-soft bg-surface/40 space-y-3 expand-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2} />
              <span className="text-muted text-xs font-mono font-bold uppercase tracking-wider mr-1 w-16 hidden sm:inline">
                Impact
              </span>
              <div className="flex items-center gap-1.5">
                {ALL_IMPACTS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={enabled[i]}
                    className={`text-xs font-mono font-semibold px-2 py-1 rounded border leading-none transition-colors ${chipClasses(i, enabled[i])}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2} />
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                aria-label="Display timezone"
                className="text-xs font-mono font-medium bg-surface border border-border rounded px-2 py-1 text-text-secondary hover:border-accent/50 focus:border-accent/60 focus:outline-none transition-colors cursor-pointer"
              >
                {TIMEZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Coins className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2} />
            <span className="text-muted text-xs font-mono font-bold uppercase tracking-wider mr-1 w-16 hidden sm:inline">
              Currency
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {currencies.map((c) => {
                const active = enabledCcy[c] !== false;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCcy(c)}
                    aria-pressed={active}
                    className={`text-xs font-mono font-semibold px-2 py-1 rounded border leading-none transition-colors ${
                      active
                        ? "text-text-primary border-accent/40 bg-accent/10"
                        : "text-muted border-border hover:border-accent/50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Event rows (grouped by day) */}
      {events.length === 0 ? (
        <div className="px-5 py-6 text-center text-muted text-[13px] font-mono font-medium">
          Couldn&rsquo;t load the calendar right now — try again shortly.
        </div>
      ) : visible.length === 0 ? (
        <div className="px-5 py-6 text-center text-muted text-[13px] font-mono font-medium">
          No events match the selected filters.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          {visible.map((n, i) => {
            const day = fmtDay(n.ts, tz);
            const prevDay = i > 0 ? fmtDay(visible[i - 1].ts, tz) : null;
            const showDay = day !== prevDay;
            return (
              <div key={n.id}>
                {showDay && (
                  <div className="px-5 py-1.5 bg-surface/60 border-y border-border-soft text-muted text-[11px] font-mono font-bold uppercase tracking-[0.15em] sticky top-0">
                    {day}
                  </div>
                )}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border-soft last:border-0">
                  <span className="text-text-secondary text-[13px] font-mono font-medium tabular-nums w-12 shrink-0">
                    {fmtTime(n.ts, tz)}
                  </span>
                  <span className="text-text-primary text-[13px] font-mono font-bold w-10 shrink-0">
                    {n.currency}
                  </span>
                  <span className="text-text-secondary text-[15px] font-medium flex-1 min-w-0 truncate" title={n.title}>
                    {n.title}
                  </span>
                  {(n.forecast || n.previous) && (
                    <span className="hidden md:block text-muted text-[11px] font-mono font-medium shrink-0 text-right">
                      {n.forecast && <span>F {n.forecast}</span>}
                      {n.forecast && n.previous && <span> · </span>}
                      {n.previous && <span>P {n.previous}</span>}
                    </span>
                  )}
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-px rounded border leading-tight shrink-0 ${impactClasses(n.impact)}`}>
                    {n.impact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footnote */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-t border-border-soft">
        <Info className="w-3 h-3 text-muted shrink-0" strokeWidth={2} />
        <span className="text-muted text-[13px] font-mono font-medium">
          Live data from ForexFactory (FairEconomy feed) · this week · updates ~every 30 min.
        </span>
      </div>
    </div>
  );
}
