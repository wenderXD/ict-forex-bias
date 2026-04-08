"use client";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

export default function MarketOverview({ text }: { text: string }) {
  const { lang } = useLang();

  return (
    <div className="mb-8">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Label bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
            <span className="text-accent text-xs font-mono uppercase tracking-[0.18em] font-medium">
              {t[lang].marketOverview}
            </span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted text-xs font-mono">AI · ICT Framework</span>
        </div>

        {/* Narrative */}
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <p className="serif italic text-text-secondary leading-relaxed text-sm sm:text-base">
            &ldquo;{text}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
