import { Quote } from "lucide-react";
import { t } from "@/lib/translations";

export default function MarketOverview({ text }: { text: string }) {
  return (
    <div className="mb-8">
      <div className="relative border border-border rounded-xl overflow-hidden bg-card card-raise">
        {/* Label bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-soft">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
            <span className="text-accent text-xs font-mono uppercase tracking-[0.2em] font-medium">
              {t.marketOverview}
            </span>
          </div>
          <div className="flex-1 h-px bg-border-soft" />
          <span className="text-muted text-xs font-mono">AI · ICT Framework</span>
        </div>

        {/* Narrative — editorial pull quote */}
        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          <Quote className="absolute left-3 top-4 w-7 h-7 text-accent/25 pointer-events-none" strokeWidth={1.5} />
          <p className="serif text-text-primary/90 leading-relaxed text-lg sm:text-xl pl-8">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
