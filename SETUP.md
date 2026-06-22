# Summer Ledger — Setup Guide

## What you're deploying
A React app (Vite) hosted on Netlify, backed by a Supabase Postgres database.
Both parents access the same URL. Data is shared in real time.

---

## Step 1 — Supabase (database, ~5 min)

1. Go to https://supabase.com and create a free account
2. Click "New project" — name it `allowance-ledger`, pick any region, set a DB password
3. Once the project is ready, go to: **SQL Editor → New query**
4. Paste the contents of `supabase/schema.sql` and click **Run**
5. Go to **Project Settings → API**
6. Copy two values — you'll need them in Step 3:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long string under "Project API keys")

---

## Step 2 — GitHub (host your code, ~5 min)

1. Go to https://github.com and create a free account (or use existing)
2. Click **New repository** → name it `allowance-ledger` → Create
3. On your computer, open Terminal in this project folder and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/allowance-ledger.git
   git push -u origin main
   ```

---

## Step 3 — Netlify (hosting, ~5 min)

1. Go to https://netlify.com and sign up (free)
2. Click **Add new site → Import an existing project → GitHub**
3. Select your `allowance-ledger` repo
4. Build settings (Netlify usually auto-detects these):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Before deploying, go to **Site configuration → Environment variables** and add:
   ```
   VITE_SUPABASE_URL        = (your Project URL from Step 1)
   VITE_SUPABASE_ANON_KEY   = (your anon key from Step 1)
   VITE_PARENT_PIN          = (choose a PIN, e.g. 5847)
   ```
6. Click **Deploy site**

Netlify gives you a URL like `https://sunny-ledger-abc123.netlify.app`.
You can set a custom domain later if you want something cleaner.

---

## Sharing with your spouse

Just send them the Netlify URL. Bookmark it on both phones.
The PIN protects edits — kids can view balances without it.

---

## Local development (optional)

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev
```

---

## Changing the PIN

Update the `VITE_PARENT_PIN` environment variable in Netlify → redeploy.

## Adding a kid or changing allowance

Edit `src/App.jsx`:
- `KIDS` array (line ~9) — add/remove names
- `WEEKLY_ALLOWANCE` (line ~10) — change the dollar amount
- `THEME` object — add a color theme for new kids

Commit and push — Netlify redeploys automatically.
