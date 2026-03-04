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
            // Match exactly or start with to support subroutes if needed, 
            // but for exact matches on sidebar we can just use the base path.
            // Example link: '/my-absences' or '/tasks/123'
            // We want to extract the base module path.
            const urlObj = new URL(notif.link, 'http://localhost');
            const pathParts = urlObj.pathname.split('/');
            const basePath = `/${pathParts[1]}`; // e.g., '/my-absences'

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
