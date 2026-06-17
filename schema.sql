-- Community feature tables for ICT Forex Bias (per-instrument votes + chat).
-- The app also self-migrates these on first use; this file is for manual setup:
-- `npm run db:migrate` or paste into the Neon SQL editor.

CREATE TABLE IF NOT EXISTS instrument_votes (
  date       text NOT NULL,
  symbol     text NOT NULL,
  user_id    text NOT NULL,
  direction  text NOT NULL CHECK (direction IN ('Bullish', 'Bearish', 'Neutral')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, symbol, user_id)
);

CREATE TABLE IF NOT EXISTS instrument_chat (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date       text NOT NULL,
  symbol     text NOT NULL,
  user_id    text NOT NULL,
  author     text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instrument_chat_idx ON instrument_chat (date, symbol, created_at);
