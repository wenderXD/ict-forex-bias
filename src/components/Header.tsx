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
    { weekday: "short", month: "short", day: "numeric", year: "numeric" }
  );

  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      })
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center gap-0">
              <span className="font-mono font-semibold text-sm text-text-primary tracking-tight">
                ICT
              </span>
              <span className="font-mono font-bold text-sm text-accent">.</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <span className="hidden sm:block text-text-secondary text-xs font-mono uppercase tracking-[0.18em]">
              Forex Bias
            </span>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live indicator + date */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
                <span className="text-text-secondary text-xs font-mono">{formattedDate}</span>
              </div>
              {formattedTime && (
                <>
                  <span className="text-border text-xs">·</span>
                  <span className="text-muted text-xs font-mono">{formattedTime}</span>
                </>
              )}
            </div>

            <div className="hidden sm:block h-4 w-px bg-border" />

            <button
              onClick={toggle}
              className="h-7 px-2.5 text-xs font-mono font-medium border border-border hover:border-accent/60 hover:text-accent rounded transition-all text-text-secondary leading-none"
            >
              {lang === "en" ? "RU" : "EN"}
            </button>

            <Link
              href="/archive/"
              className="h-7 px-2.5 flex items-center text-xs font-mono border border-border hover:border-accent/60 hover:text-accent rounded transition-all text-text-secondary"
            >
              {tr.archive}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
