"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { sql, dbEnabled, ensureSchema } from "@/lib/db";
import { clerkEnabled } from "@/lib/flags";

export type Direction = "Bullish" | "Bearish" | "Neutral";

export type Sentiment = {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
};

export type ChatMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: "not_configured" | "unauthenticated" | "empty" };

const EMPTY_SENTIMENT: Sentiment = { bullish: 0, bearish: 0, neutral: 0, total: 0 };

function ready(): boolean {
  return dbEnabled && clerkEnabled && !!sql;
}

/* ─── Votes (per date + instrument) ─── */

export async function getSentiment(date: string, symbol: string): Promise<Sentiment> {
  if (!ready()) return EMPTY_SENTIMENT;
  await ensureSchema();
  const rows = (await sql!`
    SELECT direction, COUNT(*)::int AS n
    FROM instrument_votes WHERE date = ${date} AND symbol = ${symbol}
    GROUP BY direction
  `) as { direction: Direction; n: number }[];

  const s = { ...EMPTY_SENTIMENT };
  for (const r of rows) {
    if (r.direction === "Bullish") s.bullish = r.n;
    else if (r.direction === "Bearish") s.bearish = r.n;
    else if (r.direction === "Neutral") s.neutral = r.n;
  }
  s.total = s.bullish + s.bearish + s.neutral;
  return s;
}

export async function getMyVote(date: string, symbol: string): Promise<Direction | null> {
  if (!ready()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  await ensureSchema();
  const rows = (await sql!`
    SELECT direction FROM instrument_votes
    WHERE date = ${date} AND symbol = ${symbol} AND user_id = ${userId}
  `) as { direction: Direction }[];
  return rows[0]?.direction ?? null;
}

export async function castVote(
  date: string,
  symbol: string,
  direction: Direction
): Promise<ActionResult<{ sentiment: Sentiment; myVote: Direction }>> {
  if (!ready()) return { ok: false, error: "not_configured" };
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthenticated" };

  await ensureSchema();
  await sql!`
    INSERT INTO instrument_votes (date, symbol, user_id, direction)
    VALUES (${date}, ${symbol}, ${userId}, ${direction})
    ON CONFLICT (date, symbol, user_id)
    DO UPDATE SET direction = ${direction}, created_at = now()
  `;
  return { ok: true, sentiment: await getSentiment(date, symbol), myVote: direction };
}

/* ─── Chat (per date + instrument) ─── */

export async function getMessages(date: string, symbol: string): Promise<ChatMessage[]> {
  if (!ready()) return [];
  await ensureSchema();
  let viewerId: string | null = null;
  try {
    viewerId = (await auth()).userId;
  } catch {
    viewerId = null;
  }
  const rows = (await sql!`
    SELECT id, user_id, author, body, created_at
    FROM instrument_chat WHERE date = ${date} AND symbol = ${symbol}
    ORDER BY created_at ASC LIMIT 200
  `) as { id: string; user_id: string; author: string; body: string; created_at: string }[];

  return rows.map((r) => ({
    id: String(r.id),
    author: r.author,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    mine: !!viewerId && r.user_id === viewerId,
  }));
}

export async function postMessage(
  date: string,
  symbol: string,
  body: string
): Promise<ActionResult<{ messages: ChatMessage[] }>> {
  if (!ready()) return { ok: false, error: "not_configured" };
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const clean = body.trim().slice(0, 1000);
  if (!clean) return { ok: false, error: "empty" };

  await ensureSchema();
  const user = await currentUser();
  const author =
    user?.firstName || user?.username || user?.fullName || "Trader";

  await sql!`
    INSERT INTO instrument_chat (date, symbol, user_id, author, body)
    VALUES (${date}, ${symbol}, ${userId}, ${author}, ${clean})
  `;
  return { ok: true, messages: await getMessages(date, symbol) };
}
