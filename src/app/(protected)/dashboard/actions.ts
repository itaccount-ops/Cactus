'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const now = new Date();
    // Start of week (Monday)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // End of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    try {
        const [weekEntries, user] = await Promise.all([
            prisma.timeEntry.findMany({
                where: {
                    userId: session.user.id,
                    date: {
                        gte: startOfWeek,
                        lte: endOfWeek,
                    },
                },
                include: {
                    project: {
                        select: {
                            code: true,
                            name: true,
                        }
                    }
                }
            }),
            prisma.user.findUnique({
                where: { id: session.user.id }
            })
        ]);

        const weekHours = weekEntries.reduce((acc: number, e: { hours: number }) => acc + e.hours, 0);

        // Calculate project breakdown
        const breakdownMap = weekEntries.reduce((acc: Record<string, { code: string; name: string; hours: number }>, e: any) => {
            const key = e.projectId;
            if (!acc[key]) {
                acc[key] = {
                    code: e.project.code,
                    name: e.project.name,
                    hours: 0,
                };
            }
            acc[key].hours += e.hours;
            return acc;
        }, {});

        const projectBreakdown = Object.values(breakdownMap).sort((a: any, b: any) => b.hours - a.hours);

        // Weekly target: 5 working days * daily work hours
        const targetHours = (user?.dailyWorkHours || 8) * 5;

        return {
            weekHours,
            targetHours,
            diff: Math.round((weekHours - targetHours) * 10) / 10,
            recentEntries: weekEntries.slice(-5).reverse(), // Last 5 entries
            projectBreakdown: projectBreakdown.map((p: any, index) => ({
                ...p,
                projectId: Object.keys(breakdownMap)[index],
                entries: weekEntries.filter((e: any) => e.project.code === p.code).length
            })),
        };
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        return null; // Return null handled by the UI
    }
}

// Obtener tareas pendientes del usuario
export async function getMyPendingTasks() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const tasks = await prisma.task.findMany({
            where: {
                assignedToId: session.user.id,
                status: {
                    in: ['PENDING', 'IN_PROGRESS']
                }
            },
            include: {
                project: {
                    select: {
                        code: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' }
            ],
            take: 5
        });

        return tasks;
    } catch (error) {
        console.error('Error fetching pending tasks:', error);
        return [];
    }
}
