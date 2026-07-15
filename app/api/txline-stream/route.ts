export const runtime = "nodejs";

// Proxy TxLINE SSE scores stream, injecting auth headers server-side
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fixtureId = searchParams.get("fixtureId");
  
  const API_ORIGIN = process.env.TXLINE_API_ORIGIN || process.env.NEXT_PUBLIC_TXLINE_API_ORIGIN || "https://txline-dev.txodds.com";
  const apiToken = req.headers.get("x-txline-token") || process.env.NEXT_PUBLIC_TXLINE_API_TOKEN || process.env.TXLINE_API_TOKEN || "";
  
  // Get a guest JWT
  let guestJwt = "";
  try {
    const authRes = await fetch(`${API_ORIGIN}/auth/guest/start`, { method: "POST" });
    const authJson = await authRes.json();
    guestJwt = authJson.token;
  } catch {}

  const upstreamUrl = new URL(`${API_ORIGIN}/api/scores/stream`);
  if (fixtureId) upstreamUrl.searchParams.set("fixtureId", fixtureId);

  const upstream = await fetch(upstreamUrl.toString(), {
    headers: {
      "Authorization": `Bearer ${guestJwt}`,
      "X-Api-Token": apiToken,
      "Accept": "text/event-stream",
    },
  });

  if (!upstream.ok || !upstream.body) {
    // Fallback: mock SSE stream for demo
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let seq = 0;
        const send = () => {
          const payload = JSON.stringify({ 
            mock: true, 
            ts: Date.now(), 
            fixtureId: fixtureId || 900101,
            seq: seq++ 
          });
          controller.enqueue(encoder.encode(`id: ${Date.now()}:${seq}\ndata: ${payload}\n\n`));
        };
        send();
        const iv = setInterval(send, 8000);
        // @ts-ignore
        controller._iv = iv;
      },
      cancel(controller: any) {
        if (controller._iv) clearInterval(controller._iv);
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
