"use client";
import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/flags";
import {
  castVote,
  getSentiment,
  getMyVote,
  type Sentiment,
  type Direction,
} from "@/app/actions/community";

const DIRS: { key: Direction; cls: string; Icon: typeof TrendingUp }[] = [
  { key: "Bullish", cls: "text-bullish border-bullish/40 bg-bullish/10", Icon: TrendingUp },
  { key: "Neutral", cls: "text-neutral border-neutral/40 bg-neutral/10", Icon: Minus },
  { key: "Bearish", cls: "text-bearish border-bearish/40 bg-bearish/10", Icon: TrendingDown },
];

function Live({ date, symbol }: { date: string; symbol: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const [s, setS] = useState<Sentiment>({ bullish: 0, bearish: 0, neutral: 0, total: 0 });
  const [mine, setMine] = useState<Direction | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [sent, my] = await Promise.all([getSentiment(date, symbol), getMyVote(date, symbol)]);
    setS(sent);
    setMine(my);
  }, [date, symbol]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const vote = async (d: Direction) => {
    setBusy(true);
    const r = await castVote(date, symbol, d);
    if (r.ok) {
      setS(r.sentiment);
      setMine(r.myVote);
    }
    setBusy(false);
  };

  const t = s.total || 1;
  const pct = (n: number) => (s.total ? Math.round((n / s.total) * 100) : 0);

  return (
    <div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-border mb-1.5">
        <div className="bg-bullish transition-all duration-500" style={{ width: `${(s.bullish / t) * 100}%` }} />
        <div className="bg-neutral transition-all duration-500" style={{ width: `${(s.neutral / t) * 100}%` }} />
        <div className="bg-bearish transition-all duration-500" style={{ width: `${(s.bearish / t) * 100}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs font-mono font-semibold mb-2.5">
        <span className="text-bullish">{pct(s.bullish)}%</span>
        <span className="text-muted">
          {s.total} vote{s.total === 1 ? "" : "s"}
        </span>
        <span className="text-bearish">{pct(s.bearish)}%</span>
      </div>

      {isLoaded && !isSignedIn ? (
        <SignInButton mode="modal">
          <button className="w-full text-[13px] font-mono font-semibold border border-accent/40 text-accent rounded py-1.5 hover:bg-accent/10 transition-colors">
            Sign in to vote
          </button>
        </SignInButton>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {DIRS.map(({ key, cls, Icon }) => (
            <button
              key={key}
              disabled={busy || !isLoaded}
              onClick={() => vote(key)}
              aria-pressed={mine === key}
              className={`flex items-center justify-center gap-1 text-[13px] font-mono font-semibold py-1.5 rounded border transition-colors disabled:opacity-50 ${
                mine === key ? cls : "border-border text-text-secondary hover:border-accent/50"
              }`}
            >
              <Icon className="w-3 h-3" strokeWidth={2.25} />
              {key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InstrumentVote({ date, symbol }: { date: string; symbol: string }) {
  if (!clerkEnabled) {
    return (
      <p className="text-muted text-[13px] font-mono font-medium">
        Community voting activates once accounts are configured.
      </p>
    );
  }
  return <Live date={date} symbol={symbol} />;
}
