/**
 * Rate Limiter
 *
 * Uses Upstash Redis for serverless-safe distributed rate limiting.
 * Falls back to a lightweight in-memory limiter when env vars are absent
 * (local dev, CI, or Upstash not configured).
 *
 * Required env vars for production distributed limiting:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

// ─── In-memory fallback ──────────────────────────────────────────────────────

interface MemEntry { count: number; resetTime: number }

class InMemoryLimiter {
    private map = new Map<string, MemEntry>();

    constructor(private max: number, private windowMs: number) {
        setInterval(() => this.gc(), 60_000).unref?.();
    }

    check(id: string): { allowed: boolean; remaining: number; resetTime: number } {
        const now = Date.now();
        let e = this.map.get(id);
        if (!e || e.resetTime < now) {
            e = { count: 1, resetTime: now + this.windowMs };
            this.map.set(id, e);
            return { allowed: true, remaining: this.max - 1, resetTime: e.resetTime };
        }
        if (e.count >= this.max) return { allowed: false, remaining: 0, resetTime: e.resetTime };
        e.count++;
        return { allowed: true, remaining: this.max - e.count, resetTime: e.resetTime };
    }

    reset(id: string) { this.map.delete(id); }

    private gc() {
        const now = Date.now();
        for (const [k, v] of this.map) if (v.resetTime < now) this.map.delete(k);
    }
}

// ─── Unified rate limiter ────────────────────────────────────────────────────

export interface LimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}

export class RateLimiter {
    private mem: InMemoryLimiter;

    constructor(
        private readonly max: number,
        private readonly windowMs: number,
        private readonly prefix = 'rl'
    ) {
        this.mem = new InMemoryLimiter(max, windowMs);
    }

    async check(id: string): Promise<LimitResult> {
        if (hasUpstash()) {
            return this.upstashCheck(id);
        }
        return this.mem.check(id);
    }

    async reset(id: string): Promise<void> {
        if (hasUpstash()) {
            const { Redis } = await import('@upstash/redis');
            const redis = Redis.fromEnv();
            await redis.del(`${this.prefix}:${id}`);
        }
        this.mem.reset(id);
    }

    private async upstashCheck(id: string): Promise<LimitResult> {
        try {
            const { Ratelimit } = await import('@upstash/ratelimit');
            const { Redis } = await import('@upstash/redis');
            const limiter = new Ratelimit({
                redis: Redis.fromEnv(),
                limiter: Ratelimit.slidingWindow(this.max, `${this.windowMs} ms`),
                prefix: this.prefix,
            });
            const { success, remaining, reset } = await limiter.limit(id);
            return { allowed: success, remaining, resetTime: reset };
        } catch {
            // Upstash unavailable at runtime — degrade to in-memory
            return this.mem.check(id);
        }
    }
}

function hasUpstash(): boolean {
    return Boolean(
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
    );
}

// ─── Singleton instances ─────────────────────────────────────────────────────

export const apiLimiter = new RateLimiter(100, 60_000, 'api');
export const authLimiter = new RateLimiter(5, 900_000, 'auth');    // 5 req / 15 min
export const uploadLimiter = new RateLimiter(10, 60_000, 'upload');

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function logRateLimitBlock(identifier: string, limiter = 'unknown'): void {
    console.warn(
        `[RATE_LIMIT_BLOCK] limiter=${limiter} id=${identifier} time=${new Date().toISOString()}`
    );
}

export function getClientIdentifier(request: Request, userId?: string): string {
    if (userId) return `user:${userId}`;
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return `ip:${ip}`;
}

export async function checkRateLimit(
    identifier: string,
    limiter: RateLimiter = apiLimiter
): Promise<{ allowed: boolean; headers: Record<string, string>; remaining: number }> {
    const result = await limiter.check(identifier);
    return {
        allowed: result.allowed,
        remaining: result.remaining,
        headers: {
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        },
    };
}
