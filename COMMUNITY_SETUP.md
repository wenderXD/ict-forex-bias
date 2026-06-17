# Community features — setup (votes + chat)

The site works **without** any of this. These steps switch on the auth-gated
community **bias voting** (home page) and **per-day discussion** (each archive day).
Everything is free-tier friendly (Vercel Hobby + Clerk free + Neon free).

## 1. Clerk (authentication)

1. Create an application at <https://dashboard.clerk.com>.
2. Enable the sign-in methods you want (email, Google, GitHub, …).
3. Copy the two API keys from **API Keys**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts `pk_…`)
   - `CLERK_SECRET_KEY` (starts `sk_…`)

## 2. Database (Neon / Vercel Postgres)

**Option A — from Vercel (easiest once deployed):** Project → **Storage** →
create a **Postgres** (Neon) database → it auto-adds the connection env var.
Copy it into `DATABASE_URL`.

**Option B — Neon directly:** create a project at <https://neon.tech>, copy the
connection string into `DATABASE_URL` (include `?sslmode=require`).

## 3. Local `.env.local`

Copy `.env.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

## 4. Create the tables

```
npm run db:migrate
```

(Or paste `schema.sql` into the Neon SQL editor.)

## 5. Run

```
npm run dev
```

The header gains a **Sign in** button, the home page shows the live
**Community Bias** vote, and each `/archive/<date>` page gains a **Discussion**
thread. Voting/chat require sign-in; reading stays public.

## 6. Deploy on Vercel

Add the same three env vars under **Project → Settings → Environment Variables**,
then redeploy. Run the migration once against the production database
(`DATABASE_URL=… npm run db:migrate`, or the Neon SQL editor).

---

### Notes
- **Without** these env vars the community widgets show a quiet "activates once
  configured" placeholder — nothing breaks.
- One vote per signed-in user per day (changeable). Chat polls every 5s.
- Vercel **Hobby** is for non-commercial use; monetizing requires Pro.
