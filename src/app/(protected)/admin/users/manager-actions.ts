'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Returns the list of user IDs a given user can see data for.
 * - SUPERADMIN / ADMIN: returns all users in the same company.
 * - MANAGER: returns own ID + IDs of directly managed users.
 * - WORKER: returns only own ID.
 */
export async function getManagedUserIds(targetUserId?: string): Promise<string[]> {
    const session = await auth();
    if (!session?.user) return [];

    const userId = targetUserId ?? (session.user.id as string);
    const role = (session.user as any).role as string;
    const companyId = (session.user as any).companyId as string | undefined;

    if (['SUPERADMIN', 'ADMIN'].includes(role) && companyId) {
        const users = await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true },
        });
        return users.map(u => u.id);
    }

    // MANAGER: base user + managed users
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            managedUsers: { select: { id: true } },
        },
    });

    if (!user) return [userId];
    return [userId, ...user.managedUsers.map((u: { id: string }) => u.id)];
}

/**
 * Returns the list of users directly managed by a manager (for the admin UI).
 */
export async function getManagedUsers(managerId: string) {
    const user = await prisma.user.findUnique({
        where: { id: managerId },
        select: {
            managedUsers: {
                select: { id: true, name: true, email: true, department: true },
            },
        },
    });
    return user?.managedUsers ?? [];
}

/**
 * Set the full list of users that a manager directly manages.
 * Replaces the existing list.
 */
export async function setManagedUsers(managerId: string, userIds: string[]): Promise<void> {
    await prisma.user.update({
        where: { id: managerId },
        data: {
            managedUsers: {
                set: userIds.map(id => ({ id })),
            },
        },
    });
}

/**
 * Add a single user to a manager's managed list.
 */
export async function addManagedUser(managerId: string, userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: managerId },
        data: {
            managedUsers: { connect: { id: userId } },
        },
    });
}

/**
 * Remove a single user from a manager's managed list.
 */
export async function removeManagedUser(managerId: string, userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: managerId },
        data: {
            managedUsers: { disconnect: { id: userId } },
        },
    });
}
