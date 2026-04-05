import BiasCard from "./BiasCard";
import { InstrumentBias } from "@/types/bias";

const CATEGORY_ORDER = ["Forex", "Index", "Commodity"];
const CATEGORY: Record<string, string> = {
  EURUSD: "Forex", GBPUSD: "Forex", AUDUSD: "Forex",
  NZDUSD: "Forex", USDCAD: "Forex", USDCHF: "Forex", USDJPY: "Forex",
  DXY:    "Index", SPX500: "Index",
  XAUUSD: "Commodity", XAGUSD: "Commodity", USOIL: "Commodity",
};

interface BiasGridProps {
  instruments: InstrumentBias[];
}

export default function BiasGrid({ instruments }: BiasGridProps) {
  const grouped: Record<string, InstrumentBias[]> = {};

  for (const inst of instruments) {
    const cat = CATEGORY[inst.symbol] ?? "Other";
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
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-text-primary font-semibold text-lg">{cat}</h2>
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-xs">{items.length} instruments</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((inst) => (
                <BiasCard key={inst.symbol} data={inst} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
