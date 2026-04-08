"use client";
import { useState, useEffect } from "react";

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

const KZ_COLORS: Record<string, { text: string; bg: string; border: string; dim: string }> = {
  "asia":     { text: "#C084FC", bg: "rgba(192,132,252,0.07)", border: "rgba(192,132,252,0.22)", dim: "rgba(192,132,252,0.45)" },
  "london":   { text: "#38BDF8", bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.22)",  dim: "rgba(56,189,248,0.45)"  },
  "ny-forex": { text: "#AAFF45", bg: "rgba(170,255,69,0.07)",  border: "rgba(170,255,69,0.22)",  dim: "rgba(170,255,69,0.45)"  },
  "ny-index": { text: "#FB923C", bg: "rgba(251,146,60,0.07)",  border: "rgba(251,146,60,0.22)",  dim: "rgba(251,146,60,0.45)"  },
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
      <div className="mb-8 border border-border rounded-lg bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-secondary">Kill Zones</span>
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
    <div className="mb-8 border border-border rounded-lg bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          {anyActive && <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />}
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-secondary font-medium">
            Kill Zones
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs font-mono">New York</span>
          <span className="text-text-primary text-xs font-mono font-medium tabular-nums">
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
                  className="text-xs font-mono font-semibold"
                  style={{
                    color: isActive
                      ? colors.text
                      : isUpcoming
                      ? colors.dim
                      : "#3D5270",
                  }}
                >
                  {kz.label}
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-px rounded-sm border leading-tight"
                  style={
                    isActive
                      ? { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }
                      : isUpcoming
                      ? { color: colors.dim, borderColor: "rgba(27,43,69,0.8)", backgroundColor: "transparent" }
                      : { color: "#3D5270", borderColor: "#1B2B45", backgroundColor: "transparent" }
                  }
                >
                  {isActive ? "LIVE" : isUpcoming ? "SOON" : "CLOSED"}
                </span>
              </div>

              {/* Time range */}
              <div className="text-xs font-mono text-muted mb-2.5">
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
              <div className="text-xs font-mono">
                <span
                  style={{
                    color: isActive
                      ? colors.text
                      : isUpcoming
                      ? "#7A93B8"
                      : "#3D5270",
                  }}
                >
                  {timer}
                </span>
              </div>

              {/* Scope */}
              <div className="text-[10px] font-mono text-muted mt-1">{kz.scope}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
