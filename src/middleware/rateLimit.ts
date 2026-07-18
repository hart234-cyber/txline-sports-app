// Production-grade in-memory rate limiter
// Limits requests per IP per endpoint per time window

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const defaultConfig: RateLimitConfig = { maxRequests: 20, windowMs: 60000 };

const stores = new Map<string, { requests: number[]; config: RateLimitConfig }>();

function getKey(req: Request, endpointKey: string): string {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  return `${ip}:${endpointKey}`;
}

export function rateLimit(endpointKey: string, config?: Partial<RateLimitConfig>) {
  return function middleware(req: Request) {
    const cfg = { ...defaultConfig, ...config };
    const key = getKey(req, endpointKey);
    const now = Date.now();

    if (!stores.has(key)) {
      stores.set(key, { requests: [now], config: cfg as RateLimitConfig });
      return { allowed: true, remaining: cfg.maxRequests - 1 };
    }

    const entry = stores.get(key)!;
    entry.requests = entry.requests.filter((t) => now - t < cfg.windowMs);

    if (entry.requests.length >= cfg.maxRequests) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.requests[0] + cfg.windowMs - now) / 1000) };
    }

    entry.requests.push(now);
    return { allowed: true, remaining: cfg.maxRequests - entry.requests.length };
  };
}
