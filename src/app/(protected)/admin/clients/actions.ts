'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

async function getAdminUser() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autenticado');
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true, companyId: true }
    });
    if (!user) throw new Error('Usuario no encontrado');
    if (!['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(user.role)) throw new Error('Sin permisos');
    if (!user.companyId) throw new Error('Sin compañía asignada');
    return user;
}

export async function getAdminClients(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
}) {
    const user = await getAdminUser();
    const page = filters?.page || 1;
    const limit = filters?.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {
        companyId: user.companyId,
        ...(filters?.status && filters.status !== 'ALL' ? { status: filters.status as any } : {}),
        ...(filters?.search ? {
            OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { companyName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { industry: { contains: filters.search, mode: 'insensitive' } },
            ]
        } : {})
    };

    const [clients, total] = await Promise.all([
        prisma.client.findMany({
            where,
            include: {
                contacts: { orderBy: { isPrimary: 'desc' }, take: 3 },
                _count: { select: { leads: true, projects: true, invoices: true, Quote: true } }
            },
            orderBy: { name: 'asc' },
            skip,
            take: limit
        }),
        prisma.client.count({ where })
    ]);

    return { clients, total, pages: Math.ceil(total / limit) };
}

export async function createAdminClient(data: {
    name: string;
    email?: string;
    phone?: string;
    companyName?: string;
    address?: string;
    industry?: string;
    website?: string;
    notes?: string;
    status?: string;
}) {
    const user = await getAdminUser();
    const client = await prisma.client.create({
        data: {
            ...data,
            status: (data.status as any) || 'ACTIVE',
            companyId: user.companyId!,
            isActive: true,
        }
    });
    revalidatePath('/admin/clients');
    revalidatePath('/crm/clients');
    return client;
}

export async function updateAdminClient(clientId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    address?: string;
    industry?: string;
    website?: string;
    notes?: string;
    status?: string;
    isActive?: boolean;
}) {
    const user = await getAdminUser();
    const client = await prisma.client.update({
        where: { id: clientId, companyId: user.companyId! },
        data: { ...data, status: data.status as any }
    });
    revalidatePath('/admin/clients');
    revalidatePath('/crm/clients');
    return client;
}

export async function deleteAdminClient(clientId: string) {
    const user = await getAdminUser();
    await prisma.client.update({
        where: { id: clientId, companyId: user.companyId! },
        data: { isActive: false, status: 'INACTIVE' as any }
    });
    revalidatePath('/admin/clients');
    revalidatePath('/crm/clients');
    return { success: true };
}

export async function addClientContact(clientId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    isPrimary?: boolean;
}) {
    const user = await getAdminUser();

    // Verify client belongs to company
    const client = await prisma.client.findUnique({ where: { id: clientId, companyId: user.companyId! } });
    if (!client) throw new Error('Cliente no encontrado');

    if (data.isPrimary) {
        await prisma.clientContact.updateMany({ where: { clientId }, data: { isPrimary: false } });
    }

    const contact = await prisma.clientContact.create({ data: { ...data, clientId } });
    revalidatePath('/admin/clients');
    return contact;
}

export async function deleteClientContact(contactId: string) {
    const user = await getAdminUser();
    await prisma.clientContact.delete({ where: { id: contactId } });
    revalidatePath('/admin/clients');
    return { success: true };
}
