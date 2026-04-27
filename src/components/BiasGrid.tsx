"use client";
import BiasCard from "./BiasCard";
import { InstrumentBias } from "@/types/bias";
import { InstrumentOutcome } from "@/app/archive/[date]/page";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

const CATEGORY_ORDER = ["forex", "index", "commodity"] as const;

const CATEGORY: Record<string, "forex" | "index" | "commodity"> = {
  EURUSD: "forex",  GBPUSD: "forex",  AUDUSD: "forex",
  NZDUSD: "forex",  USDCAD: "forex",  USDCHF: "forex",  USDJPY: "forex",
  DXY: "index",     SPX500: "index",
  XAUUSD: "commodity", XAGUSD: "commodity", USOIL: "commodity",
};

const SECTION_NUM: Record<string, string> = {
  forex:     "01",
  index:     "02",
  commodity: "03",
};

export default function BiasGrid({
  instruments,
  outcomes,
}: {
  instruments: InstrumentBias[];
  outcomes?: Record<string, InstrumentOutcome>;
}) {
  const { lang } = useLang();
  const tr = t[lang];

  const grouped: Record<string, InstrumentBias[]> = {};
  for (const inst of instruments) {
    const cat = CATEGORY[inst.symbol] ?? "forex";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(inst);
  }

  return (
    <div className="space-y-10">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items?.length) return null;
        return (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-accent font-mono text-xs font-medium">
                {SECTION_NUM[cat]}
              </span>
              <h2 className="text-text-primary font-mono font-semibold text-xs uppercase tracking-[0.15em]">
                {tr[cat]}
              </h2>
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-xs font-mono">
                {items.length}&nbsp;{tr.instruments}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((inst) => (
                <BiasCard key={inst.symbol} data={inst} outcome={outcomes?.[inst.symbol]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
