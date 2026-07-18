export const runtime = "nodejs";

/**
 * TxLINE SSE Proxy — /api/txline-stream
 *
 * Proxies the TxLINE scores/stream SSE endpoint to the browser,
 * injecting auth headers server-side so the API token is never
 * exposed to the client.
 *
 * Query params:
 *   fixtureId  — optional; if omitted, streams all live WC2026 matches
 *
 * When no API token is configured, falls back to a clearly-labelled
 * demo stream that emits realistic score events every ~15 seconds.
 * The demo stream uses REAL match data from the WC2026 schedule so
 * no random/fake countries are ever shown.
 */

const TXLINE_ORIGINS = [
  "https://txline-dev.txodds.com",  // devnet FIRST — free-tier tokens are devnet
  "https://txline.txodds.com",       // mainnet fallback
];

function getApiToken(req: Request): string {
  const env = process.env.TXLINE_API_TOKEN || "";
  if (env && !env.startsWith("demo_") && !env.includes("paste")) return env;
  // EventSource can't send custom headers — token is passed as a URL query param
  const url = new URL(req.url);
  const qToken = url.searchParams.get("token") || "";
  if (qToken && !qToken.startsWith("demo_") && !qToken.includes("paste")) return qToken;
  return req.headers.get("x-txline-token") || "";
}

async function getGuestJwt(origin: string): Promise<string | null> {
  try {
    const r = await fetch(`${origin}/auth/guest/start`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.token || null;
  } catch {
    return null;
  }
}

// Real WC2026 final-stage fixtures for demo stream
// (same teams as the fixtures route — no random countries)
const DEMO_FIXTURES = [
  { fixtureId: 2626003, home: "France", homeCode: "FRA", away: "England", awayCode: "ENG" },
  { fixtureId: 2626004, home: "Spain", homeCode: "ESP", away: "Argentina", awayCode: "ARG" },
];

// Bug 2 fix: accept fixtureStatus so demo stream never fires goals for non-live matches
function makeDemoStream(fixtureId: string | null, fixtureStatus?: string | null): ReadableStream {
  const encoder = new TextEncoder();

  // Only emit goal events if the fixture is actually in play
  const LIVE_STATUSES = new Set(["LIVE", "1H", "2H", "HT", "live", "1h", "2h", "ht"]);
  const fixtureIsLive = fixtureStatus ? LIVE_STATUSES.has(fixtureStatus) : false;

  // Pick the right demo fixture
  const demoFixture =
    DEMO_FIXTURES.find((f) => String(f.fixtureId) === fixtureId) ||
    DEMO_FIXTURES[0];

  let seq = 0;
  let homeScore = 0;
  let awayScore = 0;
  let minute = 1;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    start(controller) {
      // Send initial connected event
      const connected = JSON.stringify({
        type: "connected",
        demo: true,
        message:
          "Demo mode — set TXLINE_API_TOKEN in .env.local for live data",
        fixtureId: demoFixture.fixtureId,
        home: demoFixture.home,
        away: demoFixture.away,
      });
      controller.enqueue(
        encoder.encode(`id: init\nevent: connected\ndata: ${connected}\n\n`)
      );

      intervalId = setInterval(() => {
        seq++;
        minute = Math.min(90, minute + Math.floor(Math.random() * 3) + 1);

        // ~12% chance of a goal each tick — BUT only if the fixture is live
        // Bug 2 fix: never emit goal events for scheduled/upcoming matches
        const goalChance = Math.random();
        let eventType = "tick";
        let scorer: string | null = null;

        if (fixtureIsLive && goalChance < 0.12) {
          eventType = "goal";
          const homeScores = Math.random() > 0.5;
          if (homeScores) {
            homeScore++;
            scorer = demoFixture.home;
          } else {
            awayScore++;
            scorer = demoFixture.away;
          }
        }

        const payload = JSON.stringify({
          type: eventType,
          demo: true,
          seq,
          fixtureId: demoFixture.fixtureId,
          home: demoFixture.home,
          homeCode: demoFixture.homeCode,
          away: demoFixture.away,
          awayCode: demoFixture.awayCode,
          homeScore,
          awayScore,
          minute,
          scorer,
          ts: Date.now(),
        });

        try {
          controller.enqueue(
            encoder.encode(
              `id: ${Date.now()}:${seq}\nevent: ${eventType}\ndata: ${payload}\n\n`
            )
          );
        } catch {
          // Client disconnected
          if (intervalId) clearInterval(intervalId);
        }
      }, 15000); // tick every 15 seconds
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fixtureId = searchParams.get("fixtureId");
  // Bug 2 fix: dashboard passes fixtureStatus so demo stream knows if match is live
  const fixtureStatus = searchParams.get("fixtureStatus");
  const API_TOKEN = getApiToken(req);

  // ── Try real TxLINE SSE stream ─────────────────────────────────────────────
  if (API_TOKEN) {
    for (const origin of TXLINE_ORIGINS) {
      const jwt = await getGuestJwt(origin);
      if (!jwt) continue;

      try {
        const upstreamUrl = new URL(`${origin}/api/scores/stream`);
        if (fixtureId) upstreamUrl.searchParams.set("fixtureId", fixtureId);

        const upstream = await fetch(upstreamUrl.toString(), {
          headers: {
            Authorization: `Bearer ${jwt}`,
            "X-Api-Token": API_TOKEN,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!upstream.ok || !upstream.body) continue;

        // Proxy the real TxLINE SSE stream directly to the browser
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Txline-Source": "live",
            "X-Txline-Origin": origin,
          },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[txline-stream] upstream error:", msg.slice(0, 120));
        continue;
      }
    }
  }

  // ── Fallback: demo stream with real WC2026 fixture data ───────────────────────
  return new Response(makeDemoStream(fixtureId, fixtureStatus), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Txline-Source": "demo",
    },
  });
}