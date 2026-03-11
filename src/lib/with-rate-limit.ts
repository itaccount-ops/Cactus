import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, type RateLimiter } from './rate-limit';
import { auth } from '@/auth';

/**
 * Middleware wrapper for rate limiting.
 *
 * Usage:
 * export const GET = withRateLimit(async (request) => { ... });
 */
export function withRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T,
    limiter?: RateLimiter
): T {
    return (async (request: Request, ...args: any[]) => {
        try {
            const session = await auth();
            const identifier = getClientIdentifier(request, session?.user?.id as string);
            const rateLimit = await checkRateLimit(identifier, limiter);

            if (!rateLimit.allowed) {
                return NextResponse.json(
                    {
                        error: 'Too many requests. Please try again later.',
                        retryAfter: Math.ceil(
                            (Date.parse(rateLimit.headers['X-RateLimit-Reset']) - Date.now()) / 1000
                        ),
                    },
                    { status: 429, headers: rateLimit.headers }
                );
            }

            const response = await handler(request, ...args);

            if (response instanceof NextResponse) {
                Object.entries(rateLimit.headers).forEach(([key, value]) => {
                    response.headers.set(key, value);
                });
            }

            return response;
        } catch (error) {
            throw error;
        }
    }) as T;
}

/**
 * Check rate limit and return early if exceeded.
 */
export async function checkAndEnforceRateLimit(
    request: Request,
    limiter?: RateLimiter
): Promise<NextResponse | null> {
    const session = await auth();
    const identifier = getClientIdentifier(request, session?.user?.id as string);
    const rateLimit = await checkRateLimit(identifier, limiter);

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(
                    (Date.parse(rateLimit.headers['X-RateLimit-Reset']) - Date.now()) / 1000
                ),
            },
            { status: 429, headers: rateLimit.headers }
        );
    }

    return null;
}
