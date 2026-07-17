<div align="center">

```
███████╗████████╗██████╗ ███████╗ █████╗ ██╗  ██╗██╗     ██╗███╗   ██╗███████╗
██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██║ ██╔╝██║     ██║████╗  ██║██╔════╝
███████╗   ██║   ██████╔╝█████╗  ███████║█████╔╝ ██║     ██║██╔██╗ ██║█████╗  
╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██╔═██╗ ██║     ██║██║╚██╗██║██╔══╝  
███████║   ██║   ██║  ██║███████╗██║  ██║██║  ██╗███████╗██║██║ ╚████║███████╗
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
```

### 🏆 Predict. Streak. Triumph.

**Real-time sports prediction streaks, powered by TxLINE live data and anchored on Solana.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![TxLINE](https://img.shields.io/badge/TxLINE-Live%20Data-00D4FF?style=for-the-badge)](https://txline.txodds.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-gold?style=for-the-badge)](LICENSE)

---

**[🚀 Live Demo](https://streakline.vercel.app)** · **[📹 Demo Video](#demo-video)** · **[📖 Docs](#architecture)**

</div>

---

## 🎯 What is StreakLine?

StreakLine is a **real-time sports prediction platform** built for the FIFA World Cup 2026 and beyond. It turns every live match into a high-stakes prediction game — can you build a streak of correct Hi-Lo calls before the final whistle?

Every prediction is **anchored on-chain via Solana** with a Merkle proof, so your streak is verifiable, tamper-proof, and permanently yours. When a goal is scored, the **AI Pundit fires a live GOAL shout** — full-screen overlay, stadium horn, confetti, and a Telegram broadcast — all triggered by real TxLINE SSE events, not simulation.

> Built for the **TxLINE × Solana World Cup 2026 Hackathon** — Consumer & Fan Experiences track.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📡 **Live TxLINE Data** | Real-time scores, odds, and match events via TxLINE SSE stream for all 104 WC2026 games + MLS, Serie A, friendlies |
| 🎯 **Hi-Lo Prediction Streaks** | Predict if the next match stat (goals, shots, corners) will be Higher or Lower — build streaks, earn points |
| 🤖 **AI Pundit Goal Shout** | Full-screen GOAL overlay + stadium horn + confetti fires the instant TxLINE detects a score change |
| ⛓ **On-Chain Proof** | Every prediction streak is hashed into a Merkle tree and anchored on Solana — verifiable forever |
| 🔊 **TTS Commentary** | Web Speech API reads out AI pundit commentary after each goal |
| 📱 **Telegram Broadcast** | Goal alerts broadcast to your Telegram channel via bot integration |
| 💰 **SOL-Staked Leagues** | Join competitive leagues by staking real devnet SOL — winner takes the pool |
| 🏆 **Live Leaderboard** | Global streak leaderboard with wallet-linked scores |
| 🌍 **All Competitions** | WC2026 shown first, then MLS, Serie A, International Friendlies, Copa América |

---

## 🛠 Tech Stack

```
Frontend          Next.js 15 (App Router) · TypeScript · Tailwind CSS
Blockchain        Solana Web3.js · Anchor Framework · @coral-xyz/anchor
Wallet            @solana/wallet-adapter-react (Phantom, Backpack, Solflare)
Live Data         TxLINE API (SSE stream + REST fixtures/odds)
AI / TTS          Web Speech API (browser-native, zero cost)
Messaging         Telegram Bot API
Database          PostgreSQL via Drizzle ORM (optional — graceful fallback)
Deployment        Vercel (Edge-compatible API routes)
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                        │
│                                                                 │
│  Landing Page ──► Dashboard ──► /activate (TxLINE onboarding)  │
│       │               │                                         │
│  Wallet Adapter   SSE EventSource ◄──── /api/txline-stream      │
│  (Phantom etc.)   (live goals)              │                   │
│       │               │                    ▼                    │
│  Solana Devnet    Hi-Lo Game          TxLINE SSE Proxy          │
│  (on-chain proof) Streak Engine       (server-side auth)        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ API Routes (Next.js)
          ┌─────────────────┼──────────────────────┐
          ▼                 ▼                       ▼
   /api/fixtures     /api/txline-stream      /api/txline-activate
   (all competitions  (SSE proxy →           (Anchor subscribe +
    WC first)          TxLINE scores/stream)  JWT token exchange)
          │                                        │
          ▼                                        ▼
   TxLINE REST API                         Solana Devnet RPC
   (fixtures, odds)                        (on-chain subscription)
          │
          ▼
   PostgreSQL (optional)
   Drizzle ORM
   (leaderboard, user sync)
```

### TxLINE Integration — All 4 Official Snippets Implemented

| Snippet | Where | What it does |
|---|---|---|
| **Snippet 1** — Setup/Config | `src/app/activate/page.tsx` L25-55 | Network config, programId, txlTokenMint, IDL import |
| **Snippet 2** — On-chain Subscribe | `src/app/activate/page.tsx` `handleActivation()` Step 3 | PDAs, ATA, `program.methods.subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)` |
| **Snippet 3** — Activate API Token | `src/app/api/txline-activate/route.ts` | Guest JWT → sign message → `/api/token/activate` |
| **Snippet 4** — Make API Calls | `src/app/api/fixtures/route.ts` + `txline-stream/route.ts` | `Authorization: Bearer <jwt>` + `X-Api-Token: <token>` on every request |

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- A Solana wallet browser extension (Phantom recommended)
- Optional: PostgreSQL database URL (app works without it)
- Optional: TxLINE API token (app runs in demo mode without it)

### 1. Clone & Install

```bash
git clone https://github.com/hart234-cyber/txline-sports-app.git
cd txline-sports-app
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# ── TxLINE (optional — app runs in demo mode without this) ──────────────────
# Get your token by visiting /activate in the app and connecting your wallet
TXLINE_API_TOKEN=your_activated_token_here

# ── Database (optional — leaderboard uses localStorage fallback without this) ─
# Free tier: https://neon.tech  or  https://supabase.com
DATABASE_URL=postgresql://user:password@host:5432/streakline

# ── Telegram (optional — goal alerts broadcast to your channel) ─────────────
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_channel_id
```

> **No token? No problem.** The app runs in demo mode with a rich fallback schedule (WC2026 finals + MLS + Serie A + friendlies). The GOAL shout fires from the demo SSE stream so you can see everything working immediately.

### 3. Run

```bash
npm run dev
# → http://localhost:3000
```

### 4. Activate TxLINE (get a real API token)

1. Open `http://localhost:3000/activate`
2. Connect your Phantom wallet (switch to **Devnet** in wallet settings)
3. Click **"Activate TxLINE Access"** — the app will:
   - Fetch a guest JWT from TxLINE
   - Submit an on-chain `subscribe` transaction via Anchor (costs ~0.001 devnet SOL)
   - Sign an auth message with your wallet
   - Exchange the signature for a real API token
4. Copy the token from the success screen → paste into `.env.local` as `TXLINE_API_TOKEN`
5. Restart the dev server — the dashboard now streams real live data

> Get free devnet SOL: `solana airdrop 1 <your-wallet-address> --url devnet`  
> Or use the [Solana Faucet](https://faucet.solana.com)

---

## ☁️ Deploy to Vercel

### One-click deploy

```bash
npx vercel --prod
```

### Set environment variables in Vercel dashboard

Go to **Project → Settings → Environment Variables** and add:

| Variable | Value | Required |
|---|---|---|
| `TXLINE_API_TOKEN` | Your activated TxLINE token | Recommended |
| `DATABASE_URL` | Neon/Supabase PostgreSQL URL | Optional |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Optional |
| `TELEGRAM_CHAT_ID` | Telegram channel/chat ID | Optional |

### Database setup (if using PostgreSQL)

```bash
npx drizzle-kit push
```

> The app works fully without a database — leaderboard falls back to localStorage, wallet sync returns a graceful 200.

---

## 📺 Demo Video

> 🎬 **[Watch the 4-minute demo on Loom / YouTube](#)**

The demo covers:
1. **Landing page** — stadium atmosphere, animated particles, live preview card
2. **TxLINE activation** — wallet connect → on-chain subscribe → token exchange
3. **Live dashboard** — real fixtures loading (WC2026 + MLS + Serie A)
4. **GOAL shout** — full-screen overlay + stadium horn + confetti firing from a live SSE event
5. **Hi-Lo game** — prediction streak building with on-chain Merkle proof
6. **Leaderboard** — global streak rankings

---

## 📸 Screenshots

| Landing Page | Dashboard | GOAL Shout |
|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![Goal](docs/screenshots/goal_shout.png) |

| On-Chain Proof | TxLINE Activation | Leaderboard |
|---|---|---|
| ![Proof](docs/screenshots/onchain_proof.png) | ![Activate](docs/screenshots/activate.png) | ![Leaderboard](docs/screenshots/leaderboard.png) |

---

## 🔌 TxLINE API Endpoints Used

| Endpoint | Route | Purpose |
|---|---|---|
| `POST /auth/guest/start` | `/api/txline-auth` | Get guest JWT for activation flow |
| `GET /fixtures` | `/api/fixtures` | Fetch all live + upcoming fixtures (all competitions) |
| `GET /scores/stream` (SSE) | `/api/txline-stream` | Real-time score updates → triggers GOAL shout |
| `POST /api/token/activate` | `/api/txline-activate` | Exchange signed wallet message for API token |
| Anchor program `subscribe()` | `/activate` page | On-chain subscription via Solana devnet |

### TxLINE API Feedback

- **What worked great:** The SSE stream is rock-solid — clean JSON events, no dropped connections, easy to proxy server-side. The single normalised schema across all competitions is a huge DX win.
- **Suggestion:** A `/fixtures/today` shortcut endpoint would reduce client-side filtering. The guest JWT flow is elegant but the devnet vs mainnet origin mismatch (same JWT, different activation endpoint) caused initial confusion — a clearer error message on the activate endpoint would help.

---

## 💼 Business Model

StreakLine has three clear monetisation paths:

| Revenue Stream | Mechanism |
|---|---|
| **SOL-Staked Leagues** | Users stake SOL to join competitive leagues; platform takes 5% of the pool |
| **Premium Streaks** | Free tier: 5 predictions/match. Premium (SOL subscription): unlimited + advanced stats |
| **Sponsored Predictions** | Brands sponsor specific match prediction rounds (e.g. "Predict the Adidas Golden Boot scorer") |

The on-chain proof system creates a **verifiable reputation layer** — users with long verified streaks become trusted tipsters, enabling a future marketplace for prediction signals.

---

## 🗂 Project Structure

```
streakline/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page (stadium design)
│   │   ├── dashboard/page.tsx          # Live match dashboard
│   │   ├── activate/page.tsx           # TxLINE activation (all 4 snippets)
│   │   ├── globals.css                 # Design system (particles, glass, GOAL overlay)
│   │   └── api/
│   │       ├── fixtures/route.ts       # All competitions, WC-first sort
│   │       ├── txline-stream/route.ts  # SSE proxy → real-time goal detection
│   │       ├── txline-activate/route.ts # Token activation proxy
│   │       ├── txline-auth/route.ts    # Guest JWT proxy
│   │       ├── txline-claim/route.ts   # Token claim helper
│   │       ├── telegram-pundit/route.ts # Telegram goal broadcast
│   │       ├── leaderboard/route.ts    # Global streak rankings
│   │       ├── user/route.ts           # Wallet sync (graceful DB fallback)
│   │       └── health/route.ts         # Health check
│   └── lib/
│       ├── db.ts                       # Drizzle ORM (optional DB)
│       └── schema.ts                   # Database schema
├── public/
│   ├── stadium-bg.jpg                  # Stadium hero image
│   └── goal-horn.mp3                   # Stadium horn sound
├── idl/
│   └── txoracle.json                   # TxLINE Anchor program IDL
└── types/
    └── txoracle.ts                     # TypeScript types for Anchor program
```

---

## 🤝 Team

Built with ❤️ for the **TxLINE × Solana World Cup 2026 Hackathon**.

- **GitHub:** [hart234-cyber](https://github.com/hart234-cyber)
- **Repo:** [txline-sports-app](https://github.com/hart234-cyber/txline-sports-app)

---

## 📄 License

MIT © 2026 StreakLine

---

<div align="center">

**Built on TxLINE · Anchored on Solana · Made for fans**

*"The beautiful game deserves beautiful data."*

</div>
