import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Proxy route: fetches the private Vercel Blob avatar using the server token
// and streams it to the browser. Stored as /api/avatar/{userId} in the image field.
export async function GET(
    _request: Request,
    { params }: { params: { userId: string } }
) {
    const { userId } = params;
    if (!userId) {
        return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const blobUrl = (user?.preferences as any)?.avatarBlobUrl as string | undefined;

        if (!blobUrl) {
            // No custom avatar — return 404 so browser shows fallback
            return new NextResponse(null, { status: 404 });
        }

        // Fetch the private blob using the read/write token as Bearer auth
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const blobResponse = await fetch(blobUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!blobResponse.ok) {
            return new NextResponse(null, { status: 404 });
        }

        const contentType = blobResponse.headers.get('content-type') ?? 'image/jpeg';
        const imageBuffer = await blobResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                // Cache for 1 hour, revalidate in background
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error: any) {
        console.error('[api/avatar] Error:', error?.message ?? error);
        return new NextResponse(null, { status: 500 });
    }
}
