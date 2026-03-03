'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

async function getCompanyId(): Promise<string> {
    const session = await auth();
    if (!session?.user) throw new Error('No autenticado');
    const companyId = (session.user as any).companyId;
    if (!companyId) throw new Error('Usuario sin empresa asignada');
    return companyId;
}

export async function getSystemSettings() {
    try {
        const settings = await prisma.systemSetting.findMany();
        return Object.fromEntries(settings.map(s => [s.key, s.value]));
    } catch {
        return {};
    }
}

export async function updateSystemSetting(key: string, value: string) {
    await auth();
    await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    revalidatePath('/admin/settings');
    return { success: true };
}

export async function getTeams() {
    try {
        const companyId = await getCompanyId();
        return await prisma.team.findMany({
            where: { companyId },
            include: {
                _count: { select: { members: true } },
            },
            orderBy: { name: 'asc' },
        });
    } catch {
        return [];
    }
}

export async function createTeam(name: string) {
    const companyId = await getCompanyId();
    const team = await prisma.team.create({
        data: { name, companyId },
        include: { _count: { select: { members: true } } },
    });
    revalidatePath('/admin/settings');
    return team;
}

export async function deleteTeam(id: string) {
    const companyId = await getCompanyId();
    const team = await prisma.team.findFirst({ where: { id, companyId } });
    if (!team) throw new Error('Equipo no encontrado');
    await prisma.team.delete({ where: { id } });
    revalidatePath('/admin/settings');
    return { success: true };
}
