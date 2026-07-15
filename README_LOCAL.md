# StreakLINE - Run Locally

World Cup Hi-Lo Stats Game – TxLINE x Superteam Earn

## 1. Get the code

Option A – git pull (if you've pushed):
```bash
git clone https://github.com/hart234-cyber/txline-sports-app.git
cd txline-sports-app
```

Option B – download ZIP from Agent workspace:
In the Arena chat, download the entire `txline-sports-app` folder, unzip, then:
```bash
cd txline-sports-app
```

## 2. Install
Requires Node.js 18+ 

```bash
npm install
```

## 3. Env (optional)
Create `.env.local`:
```
NEXT_PUBLIC_TXLINE_API_TOKEN=txl_dev_k7iof6rjxqm
```
The app will work without this – it stores your real token in localStorage after wallet activation.

## 4. Run
```bash
npm run dev
```
Open http://localhost:3000

You’ll see the StreakLINE landing page. Click “use dev token to preview game” to play instantly, or go to http://localhost:3000/activate to connect a Solana wallet (use Solflare/Phantom on Devnet) and generate a real TxLINE API key.

## 5. Build for production
```bash
npm run build
npm start
```

Deploy: `vercel --prod` – zero config.

## Project structure
- `app/page.tsx` – StreakLINE landing + game gate
- `components/StreakGame.tsx` – Hi-Lo game UI
- `app/activate/page.tsx` – Solana wallet + TxLINE API token activation
- `lib/txline-client.ts` – TxLINE API wrapper
- `app/api/fixtures/route.ts` – TxLINE fixtures proxy
- `app/api/txline-stream/route.ts` – SSE scores stream proxy

## TxLINE endpoints used
- `GET /api/fixtures/snapshot`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/scores/stream`

All with `Authorization: Bearer <guest_jwt>` + `X-Api-Token: <api_token>`
