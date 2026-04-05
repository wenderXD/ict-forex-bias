"use client";
import { useState } from "react";
import { InstrumentBias, BiasDirection } from "@/types/bias";

const CATEGORY: Record<string, string> = {
  EURUSD: "Forex", GBPUSD: "Forex", AUDUSD: "Forex",
  NZDUSD: "Forex", USDCAD: "Forex", USDCHF: "Forex", USDJPY: "Forex",
  DXY:    "Index", SPX500: "Index",
  XAUUSD: "Commodity", XAGUSD: "Commodity", USOIL: "Commodity",
};

const FULL_NAME: Record<string, string> = {
  EURUSD: "Euro / US Dollar",     GBPUSD: "British Pound / US Dollar",
  AUDUSD: "Aussie / US Dollar",   NZDUSD: "Kiwi / US Dollar",
  USDCAD: "US Dollar / Canadian", USDCHF: "US Dollar / Swiss Franc",
  USDJPY: "US Dollar / Japanese Yen",
  DXY:    "US Dollar Index",      SPX500: "S&P 500",
  XAUUSD: "Gold / US Dollar",     XAGUSD: "Silver / US Dollar",
  USOIL:  "Crude Oil (WTI)",
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

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 7 ? "bg-bullish" : value >= 5 ? "bg-accent" : "bg-neutral";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-text-secondary text-xs font-mono w-8 text-right">{value}/10</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-text-primary text-xs font-mono">{value.toFixed(value < 10 ? 2 : value < 1000 ? 3 : 5)}</span>
    </div>
  );
}

export default function BiasCard({ data }: { data: InstrumentBias }) {
  const [expanded, setExpanded] = useState(false);
  const category = CATEGORY[data.symbol] ?? "Other";
  const fullName = FULL_NAME[data.symbol] ?? data.symbol;

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.01] ${biasBg(data.daily_bias)}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Card header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-text-secondary text-xs">{category}</span>
              <span className="text-border">•</span>
              <span className="text-text-secondary text-xs">{fullName}</span>
            </div>
            <div className="text-text-primary font-bold text-xl font-mono">{data.symbol}</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${biasColor(data.daily_bias)}`}>
              {biasArrow(data.daily_bias)} {data.daily_bias}
            </div>
            <div className="text-text-secondary text-xs font-mono mt-0.5">
              {data.current_price.toFixed(data.current_price < 10 ? 2 : data.current_price < 1000 ? 3 : 5)}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-text-secondary text-xs">Confidence</span>
            <span className={`text-xs font-medium ${data.confidence >= 7 ? "text-bullish" : data.confidence >= 5 ? "text-accent" : "text-neutral"}`}>
              {data.confidence >= 7 ? "High" : data.confidence >= 5 ? "Moderate" : "Low"}
            </span>
          </div>
          <ConfidenceBar value={data.confidence} />
        </div>

        {/* HTF vs Daily bias pills */}
        <div className="flex gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${biasColor(data.weekly_bias)} border-current/30 bg-current/5`}>
            W: {data.weekly_bias}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${biasColor(data.daily_bias)} border-current/30 bg-current/5`}>
            D: {data.daily_bias}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            data.premium_discount === "Premium" ? "text-bearish border-bearish/30" :
            data.premium_discount === "Discount" ? "text-bullish border-bullish/30" :
            "text-neutral border-neutral/30"
          } bg-current/5`}>
            {data.premium_discount}
          </span>
        </div>

        {/* Draw on liquidity */}
        <div className="bg-background/50 rounded-lg px-3 py-2">
          <div className="text-muted text-xs mb-0.5">Draw on Liquidity</div>
          <div className="text-text-secondary text-xs font-mono">{data.draw_on_liquidity}</div>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center justify-center mt-3 text-muted text-xs gap-1">
          <span>{expanded ? "Hide" : "Show"} full analysis</span>
          <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border/50 p-4 sm:p-5 space-y-5"
             onClick={e => e.stopPropagation()}>

          {/* Key levels */}
          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">Key Levels</div>
            <div className="bg-background/50 rounded-lg p-3 space-y-0.5">
              <PriceRow label="Swing High"        value={data.swing_high} />
              <PriceRow label="Equilibrium (50%)" value={data.equilibrium} />
              <PriceRow label="Swing Low"         value={data.swing_low} />
              <PriceRow label="Prev. Day High"    value={data.previous_day_high} />
              <PriceRow label="Prev. Day Low"     value={data.previous_day_low} />
              <PriceRow label="Prev. Week High"   value={data.previous_week_high} />
              <PriceRow label="Prev. Week Low"    value={data.previous_week_low} />
            </div>
          </div>

          {/* Market structure */}
          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">Market Structure</div>
            <div className="bg-background/50 rounded-lg p-3 space-y-1.5">
              <div className="text-text-secondary text-xs">{data.structure_label}</div>
              <div className="text-text-secondary text-xs italic">{data.last_bos}</div>
            </div>
          </div>

          {/* POI */}
          {(data.nearest_ob || data.nearest_fvg) && (
            <div>
              <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">Key POI</div>
              <div className="bg-background/50 rounded-lg p-3">
                <div className="text-text-secondary text-xs font-mono">{data.key_poi_label}</div>
                {data.nearest_ob && (
                  <div className="text-muted text-xs mt-1">
                    Order Block: {data.nearest_ob.low.toFixed(5)} – {data.nearest_ob.high.toFixed(5)}
                  </div>
                )}
                {data.nearest_fvg && (
                  <div className="text-muted text-xs mt-1">
                    FVG: {data.nearest_fvg.bottom.toFixed(5)} – {data.nearest_fvg.top.toFixed(5)} | CE: {data.nearest_fvg.ce.toFixed(5)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Liquidity */}
          {data.liquidity_levels.length > 0 && (
            <div>
              <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">
                Liquidity Levels
              </div>
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
              <div className="text-muted text-xs mt-1">* = Equal High/Low (EQH/EQL)</div>
            </div>
          )}

          {/* Narrative */}
          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2 font-semibold">AI Narrative</div>
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-text-secondary text-xs leading-relaxed">{data.narrative}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
