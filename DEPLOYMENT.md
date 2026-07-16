# 🚀 Deployment Guide for StreakLINE

StreakLINE is a Next.js application with full backend API routes. You can easily deploy it online using **Vercel** or **Render**.

---

## ⚡ Option 1: Vercel (Recommended & Easiest)

Since Next.js is developed by Vercel, deploying to Vercel provides out-of-the-box support for API routes, Edge/Serverless functions, and optimized static asset hosting.

### Step-by-Step Instructions:

1. **Push your code to GitHub/GitLab/Bitbucket** if you haven't already.
2. Sign up or log into [Vercel](https://vercel.com).
3. Click **Add New** ➔ **Project**.
4. Import your repository (`txline-sports-app`).
5. Vercel will automatically detect **Next.js** as the Framework Preset.
6. **Configure Environment Variables** under the "Environment Variables" section:
   * `NEXT_PUBLIC_TXLINE_API_ORIGIN` ➔ `https://txline-dev.txodds.com`
   * `NEXT_PUBLIC_TXLINE_API_TOKEN` ➔ `your_activated_token_from_activate_page` (Optionally leave this blank initially and let users activate their own wallet keys on-chain via the `/activate` route).
7. Click **Deploy**.
8. Once finished, Vercel will provide a live public URL (e.g., `https://your-app-name.vercel.app`).

---

## 🌊 Option 2: Render

Render supports Next.js apps. Since StreakLINE uses backend API routes (e.g., SSE Proxy, claim endpoints, guest token proxies), you **must** deploy it as a **Web Service** (not a Static Site).

### Step-by-Step Instructions:

1. Sign up or log into [Render](https://render.com).
2. Click **New +** ➔ **Web Service**.
3. Connect your Git provider and select your repository.
4. Set the following settings:
   * **Name**: `streakline` (or any preferred name)
   * **Region**: Choose the region closest to your target audience.
   * **Branch**: `main` (or your active branch)
   * **Runtime**: `Node`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm run start`
   * **Instance Type**: `Free` (or any tier)
5. **Configure Environment Variables** (under Advanced):
   * `NEXT_PUBLIC_TXLINE_API_ORIGIN` ➔ `https://txline-dev.txodds.com`
   * `NEXT_PUBLIC_TXLINE_API_TOKEN` ➔ `your_activated_token_from_activate_page`
6. Click **Create Web Service**.

> [!NOTE]
> On Render's Free tier, the web service will spin down after 15 minutes of inactivity. When a user visits the URL, it may take 50–90 seconds to wake up. For production speed, Vercel is highly recommended.

---

## 🔑 Note on API Tokens & Activation

1. **For Judges / General Users:**
   StreakLINE includes a client-side `/activate` route. When a user connects their wallet, completes the on-chain subscription, and signs the payload, the code saves the token into their browser's `localStorage`.
   Therefore, **you do not strictly need to set `NEXT_PUBLIC_TXLINE_API_TOKEN`** in the deployment settings. If omitted, the app will run in "Demo Preview" mode until a user goes to `/activate` and completes the subscription on-chain, at which point the live feeds will connect seamlessly.
2. **For Instant Active Demo:**
   If you want the judges to see the live feed immediately without wallet activation, go to `/activate` locally, obtain an active token, and add it as `NEXT_PUBLIC_TXLINE_API_TOKEN` in your Vercel/Render dashboard config.
