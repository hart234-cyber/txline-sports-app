# StreakLINE — Production Deployment Guide

Built for the **TxLINE × Solana World Cup 2026 Hackathon**.

---

## Environment Variables (Required / Optional)

Copy `.env.local` to your hosting provider (Vercel, Netlify, etc.).

| Variable | Required | Description |
|---|---|---|
| `TXLINE_API_TOKEN` | **Recommended** | Your activated TxLINE API token (get from `/activate`). Without it, the app runs in demo mode. |
| `DATABASE_URL` | Optional | PostgreSQL URL (Neon, Supabase, etc.) for persistent leaderboard. Without it, leaderboard uses `localStorage` fallback. |
| `SOLANA_RPC` | Optional | Solana RPC endpoint. Default: `https://api.devnet.solana.com`. |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token for goal broadcasts. |
| `TELEGRAM_CHAT_ID` | Optional | Telegram chat/channel ID. |
| `TELEGRAM_SECRET` | **Required** if using Telegram | Secret header key (`x-streakline-secret`) used to secure `/api/telegram-pundit`. |
| `STREAKLINE_SECRET` | **Required** if using Telegram | Same secret value as above. Must match `.env.local`. |

> **Security:** Never add `NEXT_PUBLIC_` prefixes to any of these variables. They are server-side only.

---

## Vercel One-Click Deploy

1. Push your repo to GitHub.
2. Import the repo into Vercel.
3. Go to **Project → Settings → Environment Variables** and add the variables above.
4. Set `NODE_ENV=production`.
5. Deploy.

---

## Database Setup (Optional)

If using PostgreSQL:

```bash
npm install
npm run db:push   # Creates tables
npm run db:generate  # Generates migrations (if you modify schema)
```

Without `DATABASE_URL`, the app gracefully falls back to `localStorage`.

---

## Running Locally

```bash
git clone https://github.com/hart234-cyber/txline-sports-app.git
cd txline-sports-app
npm install
npm run dev
```

Then visit `/activate` to connect your wallet and get the `TXLINE_API_TOKEN`.

---

## Security Notes

- `/api/telegram-pundit` requires the `x-streakline-secret` header. Without it, requests return `401 Unauthorized`.
- `/api/txline-stream` and `/api/fixtures` no longer reference `NEXT_PUBLIC_TXLINE_API_TOKEN`. Only server-side `TXLINE_API_TOKEN` is used.
- The wallet adapter is configured with `Phantom`, `Solflare`, and `Backpack` adapters.

---

*MIT License — Built on TxLINE · Anchored on Solana · Made for fans*
