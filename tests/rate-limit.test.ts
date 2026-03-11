import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "../src/lib/rate-limit";

describe("Rate Limiter - Auth Protection", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter(5, 900_000);
    });

    it("should allow first 5 attempts", async () => {
        const id = "auth:test@example.com";
        for (let i = 0; i < 5; i++) {
            const r = await limiter.check(id);
            expect(r.allowed).toBe(true);
            expect(r.remaining).toBe(4 - i);
        }
    });

    it("should block after 5 attempts", async () => {
        const id = "auth:test@example.com";
        for (let i = 0; i < 5; i++) await limiter.check(id);
        const r = await limiter.check(id);
        expect(r.allowed).toBe(false);
        expect(r.remaining).toBe(0);
    });

    it("should reset rate limit after calling reset()", async () => {
        const id = "auth:success@example.com";
        await limiter.check(id);
        await limiter.check(id);
        await limiter.check(id);
        await limiter.reset(id);
        const r = await limiter.check(id);
        expect(r.allowed).toBe(true);
        expect(r.remaining).toBe(4);
    });

    it("should track different identifiers independently", async () => {
        const e1 = "auth:user1@example.com";
        const e2 = "auth:user2@example.com";
        await limiter.check(e1);
        await limiter.check(e1);
        await limiter.check(e1);
        const r2 = await limiter.check(e2);
        expect(r2.allowed).toBe(true);
        expect(r2.remaining).toBe(4);
        const r1 = await limiter.check(e1);
        expect(r1.remaining).toBe(1);
    });

    it("should provide resetTime in future", async () => {
        const id = "auth:time@example.com";
        const before = Date.now();
        const r = await limiter.check(id);
        expect(r.resetTime).toBeGreaterThan(before);
        expect(r.resetTime).toBeLessThanOrEqual(before + 900_000 + 100);
    });
});

describe("Rate Limiter - Integration Scenario", () => {
    it("should simulate brute force attack and block", async () => {
        const limiter = new RateLimiter(5, 900_000);
        const attacker = "auth:attacker@example.com";
        const results = [];
        for (let i = 0; i < 10; i++) results.push(await limiter.check(attacker));
        expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
        expect(results.slice(5).every(r => !r.allowed)).toBe(true);
        expect(results.slice(5).every(r => r.remaining === 0)).toBe(true);
    });

    it("should simulate successful login flow", async () => {
        const limiter = new RateLimiter(5, 900_000);
        const user = "auth:legit@example.com";
        let r = await limiter.check(user);
        expect(r.allowed).toBe(true);
        expect(r.remaining).toBe(4);
        r = await limiter.check(user);
        expect(r.remaining).toBe(3);
        await limiter.reset(user);
        r = await limiter.check(user);
        expect(r.remaining).toBe(4);
    });
});
