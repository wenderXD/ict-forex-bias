"use client";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";

/* ─── Kill zone definitions (all times in New York / Eastern) ─── */
interface KZ {
  id:     string;
  label:  string;
  scope:  string;
  startH: number;
  startM: number;
  endH:   number;
  endM:   number;
}

const KILLZONES: KZ[] = [
  { id: "asia",      label: "Asia",       scope: "All pairs",    startH: 19, startM: 0,  endH: 21, endM: 0  },
  { id: "london",    label: "London",     scope: "All pairs",    startH: 2,  startM: 0,  endH: 5,  endM: 0  },
  { id: "ny-forex",  label: "NY Forex",   scope: "Forex pairs",  startH: 7,  startM: 0,  endH: 10, endM: 0  },
  { id: "ny-index",  label: "NY Index",   scope: "Indices",      startH: 8,  startM: 30, endH: 11, endM: 0  },
];

type KZColor = { text: string; bg: string; border: string; dim: string };

const KZ_COLORS_DARK: Record<string, KZColor> = {
  "asia":     { text: "#9D8BC4", bg: "rgba(157,139,196,0.08)", border: "rgba(157,139,196,0.24)", dim: "rgba(157,139,196,0.48)" },
  "london":   { text: "#6FA0A8", bg: "rgba(111,160,168,0.08)", border: "rgba(111,160,168,0.24)", dim: "rgba(111,160,168,0.48)" },
  "ny-forex": { text: "#C79A5B", bg: "rgba(199,154,91,0.08)",  border: "rgba(199,154,91,0.24)",  dim: "rgba(199,154,91,0.48)"  },
  "ny-index": { text: "#C26B4E", bg: "rgba(194,107,78,0.08)",  border: "rgba(194,107,78,0.24)",  dim: "rgba(194,107,78,0.48)"  },
};

/* Darkened for legibility on the light parchment theme. */
const KZ_COLORS_LIGHT: Record<string, KZColor> = {
  "asia":     { text: "#5B4A93", bg: "rgba(91,74,147,0.10)",  border: "rgba(91,74,147,0.30)",  dim: "rgba(91,74,147,0.55)"  },
  "london":   { text: "#2F6A73", bg: "rgba(47,106,115,0.10)", border: "rgba(47,106,115,0.30)", dim: "rgba(47,106,115,0.55)" },
  "ny-forex": { text: "#8D642F", bg: "rgba(141,100,47,0.10)", border: "rgba(141,100,47,0.30)", dim: "rgba(141,100,47,0.55)" },
  "ny-index": { text: "#A8472A", bg: "rgba(168,71,42,0.10)",  border: "rgba(168,71,42,0.30)",  dim: "rgba(168,71,42,0.55)"  },
};

/* ─── Helpers ─── */
function toMins(h: number, m: number) { return h * 60 + m; }
function toSecs(h: number, m: number, s: number) { return h * 3600 + m * 60 + s; }

function getNYTime(): { h: number; m: number; s: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);

  const get = (type: string) => {
    const num = parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
    return isNaN(num) ? 0 : num;
  };

  let h = get("hour");
  if (h === 24) h = 0;
  return { h, m: get("minute"), s: get("second") };
}

function fmtClock(h: number, m: number, s: number) {
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function fmtRange(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function countdown(targetH: number, targetM: number, curH: number, curM: number, curS: number): string {
  const target = toSecs(targetH, targetM, 0);
  const cur    = toSecs(curH, curM, curS);
  let diff = target - cur;
  if (diff <= 0) diff += 86400; // wrap to next day

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function progress(startH: number, startM: number, endH: number, endM: number, curH: number, curM: number, curS: number): number {
  const start  = toSecs(startH, startM, 0);
  const end    = toSecs(endH, endM, 0);
  const cur    = toSecs(curH, curM, curS);
  const total  = end - start;
  const elapsed = cur - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

type KZStatus = "active" | "upcoming" | "closed";

function getStatus(kz: KZ, h: number, m: number): KZStatus {
  const cur   = toMins(h, m);
  const start = toMins(kz.startH, kz.startM);
  const end   = toMins(kz.endH, kz.endM);
  if (cur >= start && cur < end) return "active";
  if (cur < start)               return "upcoming";
  return "closed";
}

/* ─── Component ─── */
export default function KillzoneTracker() {
  const { theme } = useTheme();
  const KZ_COLORS = theme === "light" ? KZ_COLORS_LIGHT : KZ_COLORS_DARK;
  const [time, setTime] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const tick = () => setTime(getNYTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Skeleton while hydrating */
  if (!time) {
    return (
      <div className="mb-8 border border-border rounded-xl bg-card card-raise overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
          <span className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] text-text-secondary">Kill Zones</span>
          <div className="w-24 h-3 bg-border rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-r border-b sm:border-b-0 border-border last:border-r-0">
              <div className="w-16 h-3 bg-border rounded animate-pulse mb-2" />
              <div className="w-24 h-2 bg-border/60 rounded animate-pulse mb-1" />
              <div className="w-20 h-2 bg-border/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { h, m, s } = time;
  const anyActive = KILLZONES.some((kz) => getStatus(kz, h, m) === "active");

  return (
    <div className="mb-8 border border-border rounded-xl bg-card card-raise overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2">
          {anyActive && <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />}
          <span className="text-[13px] font-mono uppercase tracking-[0.18em] text-text-secondary font-bold">
            Kill Zones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-[13px] font-mono font-medium">New York</span>
          <span className="text-text-primary text-[13px] font-mono font-bold tabular-nums">
            {fmtClock(h, m, s)}&nbsp;ET
          </span>
        </div>
      </div>

      {/* Kill zone panels */}
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {KILLZONES.map((kz, idx) => {
          const status  = getStatus(kz, h, m);
          const colors  = KZ_COLORS[kz.id];
          const isActive   = status === "active";
          const isUpcoming = status === "upcoming";

          const pct = isActive
            ? progress(kz.startH, kz.startM, kz.endH, kz.endM, h, m, s)
            : 0;

          const timer = isActive
            ? `closes in ${countdown(kz.endH, kz.endM, h, m, s)}`
            : `opens in ${countdown(kz.startH, kz.startM, h, m, s)}`;

          const isLastRow = idx >= 2;
          const isLastCol = idx === 3;

          return (
            <div
              key={kz.id}
              className={`relative p-4 transition-colors ${
                !isLastCol ? "border-r border-border" : ""
              } ${
                !isLastRow ? "border-b sm:border-b-0 border-border" : ""
              }`}
              style={isActive ? { backgroundColor: colors.bg } : {}}
            >
              {/* Name + status badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-sm font-mono font-bold"
                  style={{
                    color: isActive
                      ? colors.text
                      : isUpcoming
                      ? colors.dim
                      : "rgb(var(--text-2))",
                  }}
                >
                  {kz.label}
                </span>
                <span
                  className="text-[11px] font-mono font-bold px-1.5 py-px rounded-sm border leading-tight"
                  style={
                    isActive
                      ? { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }
                      : isUpcoming
                      ? { color: colors.dim, borderColor: "rgb(var(--border) / 0.85)", backgroundColor: "transparent" }
                      : { color: "rgb(var(--text-2))", borderColor: "rgb(var(--border))", backgroundColor: "transparent" }
                  }
                >
                  {isActive ? "LIVE" : isUpcoming ? "SOON" : "CLOSED"}
                </span>
              </div>

              {/* Time range */}
              <div className="text-[13px] font-mono font-medium text-text-secondary mb-2.5">
                {fmtRange(kz.startH, kz.startM)} – {fmtRange(kz.endH, kz.endM)}
              </div>

              {/* Progress bar (active only) */}
              {isActive && (
                <div className="h-[2px] bg-border rounded-full mb-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, backgroundColor: colors.text }}
                  />
                </div>
              )}

              {/* Countdown */}
              <div className="text-[13px] font-mono font-semibold">
                <span
                  style={{
                    color: isActive
                      ? colors.text
                      : isUpcoming
                      ? "rgb(var(--text-2))"
                      : "rgb(var(--text-2))",
                  }}
                >
                  {timer}
                </span>
              </div>

              {/* Scope */}
              <div className="text-xs font-mono font-medium text-text-secondary mt-1">{kz.scope}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
