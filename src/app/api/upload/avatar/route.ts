import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
};

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'avatar.jpg';
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'image/jpeg';

    try {
        const buffer = await request.arrayBuffer();
        if (!buffer || buffer.byteLength === 0) {
            return NextResponse.json({ error: 'Archivo vacío o no recibido' }, { status: 400 });
        }

        const fileBlob = new Blob([buffer], { type: contentType });

        const result = await put(
            `avatars/${userId}/avatar.${ext}`,
            fileBlob,
            { access: 'private', addRandomSuffix: false }
        );

        // Persist the private blob URL in preferences so the proxy can fetch it
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
        const prefs = (user?.preferences as any) || {};
        await prisma.user.update({
            where: { id: userId },
            data: {
                preferences: { ...prefs, avatarBlobUrl: result.url },
                // Store the proxy URL as the public-facing image
                image: `/api/avatar/${userId}`,
            },
        });

        // Return the proxy URL — browser will call /api/avatar/{userId} to display the image
        return NextResponse.json({ url: `/api/avatar/${userId}` });

    } catch (error: any) {
        console.error('[upload/avatar] Error:', error?.message ?? error);
        return NextResponse.json({ error: 'Error al subir la imagen: ' + (error?.message ?? 'desconocido') }, { status: 500 });
    }
}
