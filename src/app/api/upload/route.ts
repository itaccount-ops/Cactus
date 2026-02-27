import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'El archivo excede el tamaño máximo de 2MB.' }, { status: 400 });
        }

        // Ensure upload directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Generate unique filename
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
        const filename = `${randomUUID()}.${safeExt}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // Write file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        const url = `/uploads/avatars/${filename}`;

        return NextResponse.json({
            url,
            name: file.name,
            type: file.type,
            size: file.size,
            success: true
        });
    } catch (error) {
        console.error('Error al subir archivo:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
