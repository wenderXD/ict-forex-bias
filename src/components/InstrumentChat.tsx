"use client";
import { useEffect, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/flags";
import { getMessages, postMessage, type ChatMessage } from "@/app/actions/community";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Live({ date, symbol }: { date: string; symbol: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setMsgs(await getMessages(date, symbol));
  }, [date, symbol]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // light polling while the drawer is open
    return () => clearInterval(id);
  }, [load]);

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    const r = await postMessage(date, symbol, draft);
    if (r.ok) {
      setMsgs(r.messages);
      setDraft("");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
        {msgs.length === 0 ? (
          <p className="text-muted text-sm font-mono py-6 text-center">
            No messages yet — start the conversation.
          </p>
        ) : (
          msgs.map((m) => (
            <div key={m.id}>
              <div className="flex items-baseline gap-2">
                <span className={`text-[13px] font-mono font-bold ${m.mine ? "text-accent" : "text-text-primary"}`}>
                  {m.author}
                </span>
                <span className="text-muted text-[11px] font-mono font-medium">{relTime(m.createdAt)}</span>
              </div>
              <p className="text-text-secondary text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {m.body}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border-soft p-3 shrink-0">
        {isLoaded && !isSignedIn ? (
          <SignInButton mode="modal">
            <button className="w-full text-sm font-mono border border-accent/40 text-accent rounded-lg py-2.5 hover:bg-accent/10 transition-colors">
              Sign in to join the discussion
            </button>
          </SignInButton>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              placeholder="Share your read… (Ctrl/⌘+Enter)"
              rows={2}
              maxLength={1000}
              disabled={busy || !isLoaded}
              className="flex-1 resize-none text-sm bg-card border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-muted focus:border-accent/60 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={busy || !draft.trim()}
              aria-label="Send message"
              className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstrumentChat({ date, symbol }: { date: string; symbol: string }) {
  if (!clerkEnabled) {
    return (
      <div className="p-5">
        <p className="text-muted text-sm font-mono">
          Discussion activates once accounts are configured.
        </p>
      </div>
    );
  }
  return <Live date={date} symbol={symbol} />;
}
