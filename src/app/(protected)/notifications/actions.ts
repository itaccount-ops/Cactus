'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Crear notificación
export async function createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    senderId?: string;
}) {
    try {
        await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type as any,
                title: data.title,
                message: data.message,
                link: data.link,
                senderId: data.senderId,
            } as any
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Obtener notificaciones del usuario
export async function getMyNotifications() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            sender: {
                select: {
                    name: true,
                    image: true
                }
            }
        }
    } as any);
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { error: 'Error al marcar notificación' };
    }
}

// Marcar todas como leídas
export async function markAllNotificationsAsRead() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.notification.updateMany({
            where: {
                userId: session.user.id,
                isRead: false
            },
            data: { isRead: true }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { error: 'Error al marcar notificaciones' };
    }
}

// Obtener contador de no leídas global
export async function getUnreadCount() {
    const session = await auth();
    if (!session?.user?.id) return 0;

    return await prisma.notification.count({
        where: {
            userId: session.user.id,
            isRead: false
        }
    });
}

/**
 * Get unread notifications whose link starts with a given route prefix.
 * Used by pages to surface relevant unread notifications to the user on entry.
 */
export async function getUnreadNotificationsForRoute(route: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    const all = await prisma.notification.findMany({
        where: { userId: session.user.id, isRead: false },
        orderBy: { createdAt: 'desc' },
    });
    return all.filter(n => n.link?.startsWith(route));
}

/**
 * Mark all unread notifications whose link starts with a given route as read.
 * If 'global' is true, it marks them for ALL users (e.g. when an admin approves an absence, 
 * all other admins' notifications for that absence should be cleared).
 */
export async function markNotificationsAsReadForRoute(route: string, global: boolean = false) {
    const session = await auth();
    if (!session?.user?.id) return;

    const where: any = { isRead: false };
    
    // If not global, only for current user
    if (!global) {
        where.userId = session.user.id;
    }

    const all = await prisma.notification.findMany({
        where: where,
        select: { id: true, link: true },
    });
    
    const ids = all.filter(n => n.link?.startsWith(route)).map(n => n.id);
    if (ids.length === 0) return;

    await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
    });
    revalidatePath('/');
}

// Obtener sumatoria de no leídas agrupadas por ruta (link)
export async function getUnreadCountsByRoute() {
    const session = await auth();
    if (!session?.user?.id) return {};

    const unreadNotifications = await prisma.notification.findMany({
        where: {
            userId: session.user.id,
            isRead: false,
            link: {
                not: null
            }
        },
        select: {
            link: true
        }
    });

    const routeCounts: Record<string, number> = {};
    for (const notif of unreadNotifications) {
        if (notif.link) {
            const urlObj = new URL(notif.link, 'http://localhost');
            const path = urlObj.pathname;
            let basePath = path;

            // Map the link to the corresponding sidebar href
            if (path.startsWith('/hr/absences') || path.startsWith('/my-absences')) {
                // Determine if the user is checking my-absences or hr/absences.
                // Usually notifications to employee are /my-absences, and to admin are /hr/absences.
                // If it's an exact match we just use it, otherwise fall back to matching exactly.
                basePath = path.startsWith('/hr') ? '/hr/absences' : '/my-absences';
            } else if (path.startsWith('/control-horas')) {
                const parts = path.split('/');
                basePath = parts[2] ? `/control-horas/${parts[2]}` : '/control-horas/mi-hoja';
            } else if (path.startsWith('/admin')) {
                const parts = path.split('/');
                basePath = parts[2] ? `/admin/${parts[2]}` : '/admin/users';
            } else {
                basePath = `/${path.split('/')[1]}`;
            }

            routeCounts[basePath] = (routeCounts[basePath] || 0) + 1;
        }
    }

    return routeCounts;
}

// Eliminar notificación
export async function deleteNotification(notificationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.notification.delete({
            where: { id: notificationId }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { error: 'Error al eliminar notificación' };
    }
}
