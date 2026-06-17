import { neon } from "@neondatabase/serverless";

/* Postgres (Neon / Vercel Postgres) connection. Accepts whichever name your
   provider injects: DATABASE_URL (Neon) or POSTGRES_URL (Vercel Postgres).
   Without a connection string the app keeps running — community reads return
   empty and writes return not-configured. */
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const dbEnabled = !!connectionString;

export const sql = dbEnabled ? neon(connectionString!) : null;

/* Idempotent self-migration: ensures the community tables exist before the
   first query. Runs once per server instance (cached promise), so production
   works against whatever database DATABASE_URL points to without a manual
   migration step. */
let schemaPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS instrument_votes (
          date       text NOT NULL,
          symbol     text NOT NULL,
          user_id    text NOT NULL,
          direction  text NOT NULL CHECK (direction IN ('Bullish', 'Bearish', 'Neutral')),
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (date, symbol, user_id)
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS instrument_chat (
          id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          date       text NOT NULL,
          symbol     text NOT NULL,
          user_id    text NOT NULL,
          author     text NOT NULL,
          body       text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
      await sql`CREATE INDEX IF NOT EXISTS instrument_chat_idx ON instrument_chat (date, symbol, created_at)`;
    })().catch((e) => {
      schemaPromise = null; // allow retry on next call
      throw e;
    });
  }
  return schemaPromise;
}
