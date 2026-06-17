"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, MessagesSquare } from "lucide-react";
import InstrumentChat from "@/components/InstrumentChat";

type Active = { date: string; symbol: string } | null;

const ChatCtx = createContext<{
  active: Active;
  open: (date: string, symbol: string) => void;
  close: () => void;
}>({ active: null, open: () => {}, close: () => {} });

export function useChat() {
  return useContext(ChatCtx);
}

function ChatWindow({ active, onClose }: { active: Active; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);

  if (!active || !mounted) return null;

  // Portal to <body> so no transformed/filtered ancestor can affect the
  // fixed positioning — guarantees a viewport-anchored floating window.
  return createPortal(
    <div
      role="dialog"
      aria-label={`Discussion ${active.symbol}`}
      className="fixed z-[70] right-4 top-20 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-2xl flex flex-col overflow-hidden drawer-in"
    >
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft shrink-0">
        <div className="flex items-center gap-2.5">
          <MessagesSquare className="w-4 h-4 text-accent" strokeWidth={2} />
          <div>
            <div className="text-accent text-[11px] font-mono uppercase tracking-[0.2em] font-medium leading-none">
              Discussion
            </div>
            <div className="text-text-primary font-mono font-semibold text-sm mt-1 leading-none">
              {active.symbol}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close conversation"
          className="h-8 w-8 flex items-center justify-center rounded border border-border text-text-secondary hover:border-accent/60 hover:text-accent transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </header>
      <div className="flex-1 min-h-0">
        {/* key forces a fresh thread (and poll) when switching instruments */}
        <InstrumentChat key={`${active.symbol}-${active.date}`} date={active.date} symbol={active.symbol} />
      </div>
    </div>,
    document.body
  );
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active>(null);
  const open = useCallback((date: string, symbol: string) => setActive({ date, symbol }), []);
  const close = useCallback(() => setActive(null), []);

  return (
    <ChatCtx.Provider value={{ active, open, close }}>
      {children}
      <ChatWindow active={active} onClose={close} />
    </ChatCtx.Provider>
  );
}
