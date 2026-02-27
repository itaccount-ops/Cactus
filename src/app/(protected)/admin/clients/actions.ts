'use server';

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { checkPermission } from "@/lib/permissions";

export async function getAllClients() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("clients", "read");

    const clients = await prisma.client.findMany({
        where: {
            companyId: user.companyId as string,
        },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
            status: true,
            isActive: true,
        },
    });

    return clients;
}
