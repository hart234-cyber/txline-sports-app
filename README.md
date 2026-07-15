# StreakLINE — World Cup Hi-Lo Stats Game

A real-time Hi-Lo prediction game for FIFA World Cup 2026, powered by **TxLINE** blockchain-verified sports data on **Solana**.

Will the next stat update go **Higher** or **Lower**? Corners, shots, possession — predict correctly, build your streak, compete globally.

Built for the **Superteam Earn × TxLINE Fan Experience Track**.

---

## How It Works

1. **Pick a match** — Choose any live or scheduled World Cup fixture
2. **Read the AI** — Our AI pundit analyzes TxLINE odds and gives a confidence percentage
3. **Higher or Lower** — Predict if the next stat update goes up or down
4. **Build your streak** — Correct = +1, wrong = reset. Compete on the global leaderboard

---

## Features

- **Real-time TxLINE data** — Live fixtures, scores, and stat updates via TxLINE devnet API
- **AI Match Pundit** — Rule-based AI that reads TxLINE odds and provides confidence-weighted predictions with text-to-speech
- **On-chain verification** — All data cryptographically anchored on Solana via TxLINE Merkle proofs
- **Global leaderboard** — Streak-based ranking system across all World Cup matches
- **Share cards** — Canvas-generated streak share images for social media
- **Friend leagues** — Private groups with 0.05 SOL entry (coming soon)
- **Mobile-first** — Swipe to guess, responsive design, works on all devices

---

## Tech Stack

- **Frontend** — Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Blockchain** — Solana (devnet), @coral-xyz/anchor, @solana/web3.js
- **Data** — TxLINE API (fixtures, scores SSE, odds snapshots, stat validation)
- **Wallet** — Solflare via @solana/wallet-adapter
- **AI** — Rule-based pundit engine with Web Speech TTS

---

## TxLINE Integration

StreakLINE uses the following TxLINE API endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /auth/guest/start` | Guest JWT authentication (30-day expiry) |
| `POST /api/token/activate` | API token activation after on-chain subscribe |
| `GET /api/fixtures/snapshot` | Live and scheduled fixture metadata |
| `GET /api/scores/snapshot/{fixtureId}` | Real-time score and stat updates |
| `GET /api/odds/snapshot/{fixtureId}` | StablePrice odds data |
| `GET /api/scores/stat-validation` | Merkle proof verification |

**Network:** Devnet
**Program ID:** `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
**TxL Mint:** `4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG`
**Service Level:** 1 (Free World Cup tier)

All data calls require both `Authorization: Bearer <jwt>` and `X-Api-Token: <apiToken>` headers.

---

## Setup

### Prerequisites

- Node.js 20+
- Solana wallet (Solflare recommended)
- Devnet SOL for transaction fees (~0.01 SOL) — get free SOL at https://faucet.solana.com

### Installation

```bash
git clone https://github.com/hart234-cyber/txline-sports-app.git
cd txline-sports-app
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_TXLINE_API_ORIGIN=https://txline-dev.txodds.com
NEXT_PUBLIC_TXLINE_API_TOKEN=your_activated_token_here
```

### Activate TxLINE API Token

1. Run `npm run dev`
2. Open `http://localhost:3000/activate`
3. Connect Solflare wallet (set to devnet)
4. Click "Subscribe & Activate API Key"
5. Copy the token to `.env.local`
6. Restart dev server

### Run

```bash
npm run dev
```

Open `http://localhost:3000` for the landing page.
Open `http://localhost:3000/dashboard` for the game.

---

## Project Structure

```
app/
  page.tsx                  — Landing page
  dashboard/page.tsx        — Game dashboard (play, matches, rewards)
  activate/page.tsx         — TxLINE API token activation flow
  api/
    txline-auth/route.ts    — Server proxy for guest JWT
    txline-activate/route.ts — Server proxy for token activation
    fixtures/route.ts       — Fixtures endpoint with TxLINE fallback
    txline-stream/route.ts  — SSE scores proxy
components/
  StreakGame.tsx             — Core Hi-Lo game with swipe, sparkline, AI pundit
  MatchRail.tsx             — Horizontal match picker with flags
  MatchSchedule.tsx         — Full fixture list (World Cup + Friendlies)
  Leaderboard.tsx           — Global streak ranking board
lib/
  txline-client.ts          — TxLINE data client, fixtures, replay sequences
  ai-pundit.ts              — AI pundit engine with Web Speech TTS
utils/
  txline.ts                 — Network config, connection, API constants
  WalletContextProvider.tsx — Solana wallet adapter setup
idl/
  txoracle.json             — TxLINE devnet program IDL (Anchor 0.30+)
types/
  txoracle.ts               — TypeScript types for TxLINE program
```

---

## Judging Criteria Alignment

| Criteria | Implementation |
|---|---|
| **Fan Accessibility & UX** | Mobile-first swipe interface, AI pundit with TTS, one-tap gameplay |
| **Real-Time Responsiveness** | TxLINE SSE streams, live fixtures, animated stat transitions |
| **Originality** | First Hi-Lo game on blockchain-verified sports data, AI confidence meter |
| **Commercial Path** | Friend leagues (0.05 SOL), daily prize pool, on-chain streak verification |
| **Completeness** | Landing page, dashboard, activation flow, share cards, leaderboard |

---

## API Feedback for TxLINE

- DNS resolution for `txline-dev.txodds.com` fails on some Nigerian ISPs — recommend adding the devnet API to a CDN or providing a DNS fallback
- `@solana/web3.js v1.98` has a `StructError` when parsing `getAccountInfo` responses from some RPC providers — affects ATA checks during activation
- The free tier activation flow works well — guest JWT → on-chain subscribe → sign message → activate is clean and well-documented
- Historical replay data would benefit from a dedicated endpoint for demo/testing purposes

---

## License

MIT

---

Built with care for **Superteam Earn × TxLINE World Cup 2026**
