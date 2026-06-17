"use client";
import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function CategorySection({
  num,
  title,
  count,
  children,
}: {
  num: string;
  title: string;
  count: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 mb-6 group text-left"
      >
        <span className="text-accent font-mono text-xs font-medium tabular-nums">{num}</span>
        <h2 className="display text-text-primary text-xl font-medium tracking-tight group-hover:text-accent transition-colors">
          {title}
        </h2>
        <div className="flex-1 h-px rule-fade" />
        <span className="text-muted text-xs font-mono uppercase tracking-wider">{count}</span>
        <ChevronDown
          className="w-4 h-4 text-muted group-hover:text-accent transition-all duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>

      {open && <div className="expand-in">{children}</div>}
    </section>
  );
}
