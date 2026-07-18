export const dynamic = "force-dynamic";

/**
 * /api/token-status
 *
 * Returns whether a real TXLINE_API_TOKEN is configured.
 * Checks BOTH server-side env vars AND a token passed as a query param
 * (the dashboard passes the localStorage token here since server can't
 * read localStorage directly).
 * Never exposes the token value — only a boolean flag.
 */
export async function GET(req: Request) {
  // 1. Check server-side env vars first
  const envToken = process.env.TXLINE_API_TOKEN || "";

  // 2. Also accept token from query param (passed from localStorage by dashboard)
  const url = new URL(req.url);
  const qToken = url.searchParams.get("token") || "";

  const token = envToken || qToken;

  // A token is "real" if it exists and isn't a placeholder
  const hasToken =
    token.length > 0 &&
    !token.startsWith("demo_") &&
    !token.includes("paste") &&
    !token.includes("your_token") &&
    !token.includes("YOUR_TOKEN");

  return Response.json({ hasToken, source: envToken ? "env" : qToken ? "localStorage" : "none" });
}