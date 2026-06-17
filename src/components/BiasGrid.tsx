import BiasCard from "./BiasCard";
import CategorySection from "./CategorySection";
import { InstrumentBias } from "@/types/bias";
import { InstrumentOutcome } from "@/app/archive/[date]/page";
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
  date,
}: {
  instruments: InstrumentBias[];
  outcomes?: Record<string, InstrumentOutcome>;
  date: string;
}) {
  const tr = t;

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
          <CategorySection
            key={cat}
            num={SECTION_NUM[cat]}
            title={tr[cat]}
            count={`${items.length} ${tr.instruments}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((inst) => (
                <BiasCard key={inst.symbol} data={inst} outcome={outcomes?.[inst.symbol]} date={date} />
              ))}
            </div>
          </CategorySection>
        );
      })}
    </div>
  );
}
