import { AlertTriangle } from "lucide-react";

export default function RiskWarning() {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-xl border border-bearish/30 bg-bearish/10 px-4 py-3.5 sm:px-5 sm:py-4">
      <AlertTriangle className="w-5 h-5 text-bearish shrink-0 mt-0.5" strokeWidth={2} />
      <div className="max-w-[68ch]">
        <p className="font-mono font-semibold text-bearish text-[13px] tracking-tight mb-1">
          Educational use only — not financial advice
        </p>
        <p className="text-text-secondary text-sm leading-relaxed">
          Do not risk money you cannot afford to lose. This site exists purely for study and research
          purposes. The bias and analysis below are automatically generated and <span className="text-text-primary font-medium">can be wrong</span>.
          Always do your own research and never trade based on this alone.
        </p>
      </div>
    </div>
  );
}
