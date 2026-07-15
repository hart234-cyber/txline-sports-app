import { NextResponse } from "next/server";

// CRITICAL: The activation MUST use the SAME origin that issued the JWT.
// A devnet subscribe tx + mainnet JWT = "API Token not found" (403)
// The frontend sends the origin as a query param or header.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = req.headers.get("authorization") || "";

    // Get the origin from the request — frontend MUST specify which origin
    // issued the JWT so we activate on the same network
    const url = new URL(req.url);
    const origin = url.searchParams.get("origin")
      || req.headers.get("x-txline-origin")
      || "https://txline-dev.txodds.com"; // fallback to devnet

    console.log(`[txline-activate] Activating at ${origin}/api/token/activate`);

    const r = await fetch(`${origin}/api/token/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    const text = await r.text();
    console.log(`[txline-activate] Response ${r.status}: ${text.slice(0, 200)}`);

    if (!r.ok) {
      return NextResponse.json(
        { success: false, error: text, origin, status: r.status },
        { status: r.status }
      );
    }

    // Parse response — could be JSON or plain string
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    const token = typeof data === "object" ? data.token || data : data;

    console.log(`[txline-activate] SUCCESS via ${origin}`);
    return NextResponse.json({ success: true, token, origin });

  } catch (e: any) {
    console.error(`[txline-activate] Error:`, e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
