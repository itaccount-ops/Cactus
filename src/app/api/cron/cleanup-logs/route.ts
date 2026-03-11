import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cron endpoint — delete ActivityLog entries older than RETENTION_DAYS.
 * Must be called with: Authorization: Bearer <CRON_SECRET>
 *
 * Recommended schedule: daily, off-peak hours.
 */
const RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS ?? '90', 10);

export async function POST(request: Request) {
    // Auth
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

        const { count } = await prisma.activityLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });

        console.log(`[CRON] cleanup-logs: deleted ${count} entries older than ${RETENTION_DAYS} days`);

        return NextResponse.json({
            deleted: count,
            retentionDays: RETENTION_DAYS,
            cutoff: cutoff.toISOString(),
        });
    } catch (err) {
        console.error('[CRON] cleanup-logs error:', err);
        return NextResponse.json(
            { error: 'Job failed', details: err instanceof Error ? err.message : 'Unknown' },
            { status: 500 }
        );
    }
}
