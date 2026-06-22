"use client";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { clerkEnabled } from "@/lib/flags";
import AuthButtons from "@/components/AuthButtons";
import { t } from "@/lib/translations";

interface HeaderProps {
  date: string;
  generatedAt?: string;
}

export default function Header({ date, generatedAt }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const tr = t;

  const formattedDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
            <div className="flex items-baseline gap-0">
              <span className="display text-xl text-text-primary tracking-tight">
                ICT
              </span>
              <span className="display text-xl text-accent">.</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <span className="hidden sm:block text-text-secondary text-[13px] font-mono font-semibold uppercase tracking-[0.18em]">
              Forex Bias
            </span>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live indicator + date */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent live-dot" />
                <span className="text-text-secondary text-[13px] font-mono font-medium">{formattedDate}</span>
              </div>
              {formattedTime && (
                <>
                  <span className="text-border text-xs">·</span>
                  <span className="text-muted text-[13px] font-mono font-medium">{formattedTime}</span>
                </>
              )}
            </div>

            <div className="hidden sm:block h-4 w-px bg-border" />

            {/* Theme switch */}
            <button
              onClick={toggle}
              role="switch"
              aria-checked={theme === "light"}
              aria-label="Toggle color theme"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="relative inline-flex items-center h-7 w-[52px] rounded-full border border-border bg-surface hover:border-accent/60 transition-colors px-1"
            >
              {/* track icons */}
              <Sun className="absolute left-1.5 w-3 h-3 text-neutral/80" strokeWidth={2} />
              <Moon className="absolute right-1.5 w-3 h-3 text-text-secondary" strokeWidth={2} />
              {/* sliding knob */}
              <span
                className="relative z-10 h-5 w-5 rounded-full bg-accent shadow-sm flex items-center justify-center text-background transition-transform duration-300 ease-out"
                style={{ transform: theme === "light" ? "translateX(0)" : "translateX(24px)" }}
              >
                {theme === "light"
                  ? <Sun className="w-3 h-3" strokeWidth={2.5} />
                  : <Moon className="w-3 h-3" strokeWidth={2.5} />}
              </span>
            </button>

            <Link
              href="/archive/"
              className="h-7 px-2.5 flex items-center text-[13px] font-mono font-semibold border border-border hover:border-accent/60 hover:text-accent rounded transition-all text-text-secondary"
            >
              {tr.archive}
            </Link>

            {clerkEnabled && <AuthButtons />}
          </div>
        </div>
      </div>
    </header>
  );
}
