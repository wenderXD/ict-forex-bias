"use client";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

export default function MarketOverview({ text }: { text: string }) {
  const { lang } = useLang();
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-accent text-xs font-semibold uppercase tracking-widest">
          {t[lang].marketOverview}
        </span>
      </div>
      <p className="text-text-secondary leading-relaxed text-sm sm:text-base">{text}</p>
    </div>
  );
}
