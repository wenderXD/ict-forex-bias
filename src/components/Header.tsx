"use client";
import Link from "next/link";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/translations";

interface HeaderProps {
  date: string;
  generatedAt?: string;
}

export default function Header({ date, generatedAt }: HeaderProps) {
  const { lang, toggle } = useLang();
  const tr = t[lang];

  const formattedDate = new Date(date + "T12:00:00Z").toLocaleDateString(
    lang === "ru" ? "ru-RU" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
      })
    : null;

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
              <span className="text-accent text-sm font-bold">ICT</span>
            </div>
            <div>
              <div className="text-text-primary font-semibold text-sm leading-tight">{tr.siteName}</div>
              <div className="text-muted text-xs">{tr.tagline}</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-text-primary text-sm font-medium">{formattedDate}</div>
              {formattedTime && (
                <div className="text-muted text-xs">{tr.updated} {formattedTime}</div>
              )}
            </div>

            {/* Language toggle */}
            <button
              onClick={toggle}
              className="text-xs border border-border hover:border-accent/50 rounded-lg px-3 py-1.5 transition-colors font-mono font-semibold text-text-secondary hover:text-text-primary"
            >
              {lang === "en" ? "RU" : "EN"}
            </button>

            <Link
              href="/archive/"
              className="text-text-secondary hover:text-text-primary text-sm transition-colors border border-border hover:border-accent/50 rounded-lg px-3 py-1.5"
            >
              {tr.archive}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
