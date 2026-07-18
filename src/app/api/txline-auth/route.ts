import { NextResponse } from "next/server";

// IMPORTANT: JWT must come from the SAME network as the subscribe transaction.
// A devnet subscribe tx activated with a mainnet JWT = "API Token not found" (403)
// 
// Strategy: try devnet first. If DNS fails, try mainnet BUT tell the frontend
// which origin was used so the activation endpoint uses the SAME one.

const DEVNET_ORIGIN = "https://txline-dev.txodds.com";
const MAINNET_ORIGIN = "https://txline.txodds.com";

export async function GET(req: Request) {
  // Check if frontend specifically requested a network
  const url = new URL(req.url);
  const forceNetwork = url.searchParams.get("network"); // "devnet" or "mainnet"

  const origins = forceNetwork === "mainnet"
    ? [MAINNET_ORIGIN]
    : forceNetwork === "devnet"
      ? [DEVNET_ORIGIN]
      : [DEVNET_ORIGIN, MAINNET_ORIGIN]; // default: try devnet first

  for (const origin of origins) {
    try {
      console.log(`[txline-auth] Attempting JWT from: ${origin}/auth/guest/start`);

      const r = await fetch(`${origin}/auth/guest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });

      if (!r.ok) {
        console.error(`[txline-auth] ${origin} returned ${r.status}`);
        continue;
      }

      const data = await r.json();
      if (!data.token) {
        console.error(`[txline-auth] ${origin} returned no token`);
        continue;
      }

      const network = origin.includes("-dev") ? "devnet" : "mainnet";
      console.log(`[txline-auth] JWT acquired from ${network} (${origin})`);

      return NextResponse.json({
        success: true,
        token: data.token,
        origin,    // frontend MUST use this same origin for activation
        network,   // "devnet" or "mainnet"
      });
    } catch (error: any) {
      console.error(`[txline-auth] Failed ${origin}:`, error.message);
      continue;
    }
  }

  return NextResponse.json(
    { success: false, error: "Cannot reach TxLINE API. Install Cloudflare Warp (https://1.1.1.1) or change DNS to 1.1.1.1" },
    { status: 502 }
  );
}
