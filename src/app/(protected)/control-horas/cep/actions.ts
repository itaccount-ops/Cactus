'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export interface CEPWorkerData {
    userId: string;
    userName: string;
    userImage: string | null;
    department: string;
    totalHours: number;
    hourCost: number;
    totalCost: number;
    hourCostWithGG: number;
    totalCostWithGG: number;
    totalGG: number;
}

export interface CEPProjectData {
    projectId: string;
    projectCode: string;
    projectName: string;
    workers: CEPWorkerData[];
    totals: {
        totalHours: number;
        totalCost: number;
        totalCostWithGG: number;
        totalGG: number;
    };
}

export interface CEPResponse {
    projects: CEPProjectData[];
    grandTotals: {
        totalHours: number;
        totalCost: number;
        totalCostWithGG: number;
        totalGG: number;
    };
    ggPercentage: number;
}

export async function getCEPData(
    projectIds: string[],
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number,
    ggPercentage: number = 40
): Promise<CEPResponse> {
    const session = await auth();
    if (!session?.user) {
        throw new Error('No autorizado');
    }

    // Build date range
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0); // Last day of end month

    // Base query conditions
    const whereConditions: any = {
        date: {
            gte: startDate,
            lte: endDate,
        },
    };

    if (projectIds.length > 0) {
        whereConditions.projectId = { in: projectIds };
    }

    // Get aggregated hours per user per project
    const timeEntries = await prisma.timeEntry.groupBy({
        by: ['userId', 'projectId'],
        where: whereConditions,
        _sum: {
            hours: true,
        },
    });

    // Get unique user and project IDs
    const userIds = [...new Set(timeEntries.map(e => e.userId))];
    const projIds = [...new Set(timeEntries.map(e => e.projectId))];

    // Fetch user details
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
            id: true,
            name: true,
            image: true,
            department: true,
            hourCost: true,
        },
    });
    const usersMap = new Map(users.map(u => [u.id, u]));

    // Fetch project details
    const projects = await prisma.project.findMany({
        where: { id: { in: projIds } },
        select: {
            id: true,
            code: true,
            name: true,
        },
        orderBy: { code: 'asc' },
    });
    const projectsMap = new Map(projects.map(p => [p.id, p]));

    // Build response structure
    const ggMultiplier = 1 + (ggPercentage / 100);
    const projectDataMap = new Map<string, CEPProjectData>();

    for (const entry of timeEntries) {
        const user = usersMap.get(entry.userId);
        const project = projectsMap.get(entry.projectId);

        if (!user || !project) continue;

        const hours = entry._sum.hours || 0;
        // Default hour cost is 24.70 if not set
        const hourCost = Number(user.hourCost) || 24.70;
        const totalCost = hours * hourCost;
        const hourCostWithGG = hourCost * ggMultiplier;
        const totalCostWithGG = hours * hourCostWithGG;
        const totalGG = totalCostWithGG - totalCost;

        const workerData: CEPWorkerData = {
            userId: user.id,
            userName: user.name,
            userImage: user.image,
            department: user.department,
            totalHours: hours,
            hourCost,
            totalCost,
            hourCostWithGG,
            totalCostWithGG,
            totalGG,
        };

        if (!projectDataMap.has(project.id)) {
            projectDataMap.set(project.id, {
                projectId: project.id,
                projectCode: project.code,
                projectName: project.name,
                workers: [],
                totals: {
                    totalHours: 0,
                    totalCost: 0,
                    totalCostWithGG: 0,
                    totalGG: 0,
                },
            });
        }

        const projectData = projectDataMap.get(project.id)!;
        projectData.workers.push(workerData);
        projectData.totals.totalHours += hours;
        projectData.totals.totalCost += totalCost;
        projectData.totals.totalCostWithGG += totalCostWithGG;
        projectData.totals.totalGG += totalGG;
    }

    // Calculate grand totals
    const projectsArray = Array.from(projectDataMap.values());
    const grandTotals = {
        totalHours: projectsArray.reduce((sum, p) => sum + p.totals.totalHours, 0),
        totalCost: projectsArray.reduce((sum, p) => sum + p.totals.totalCost, 0),
        totalCostWithGG: projectsArray.reduce((sum, p) => sum + p.totals.totalCostWithGG, 0),
        totalGG: projectsArray.reduce((sum, p) => sum + p.totals.totalGG, 0),
    };

    return {
        projects: projectsArray,
        grandTotals,
        ggPercentage,
    };
}

export async function updateUserHourCost(userId: string, hourCost: number): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: 'No autorizado' };
    }

    // Check if user has permission (ADMIN or MANAGER)
    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { role: true },
    });

    if (!currentUser || !['ADMIN', 'MANAGER'].includes(currentUser.role)) {
        return { success: false, error: 'No tienes permisos para modificar tarifas' };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { hourCost },
        });

        revalidatePath('/control-horas/cep');
        return { success: true };
    } catch (error) {
        console.error('Error updating hour cost:', error);
        return { success: false, error: 'Error al actualizar la tarifa' };
    }
}

export async function getFilterableProjects(): Promise<{ id: string; code: string; name: string }[]> {
    const session = await auth();
    if (!session?.user) {
        return [];
    }

    const projects = await prisma.project.findMany({
        where: { isActive: true },
        select: {
            id: true,
            code: true,
            name: true,
        },
        orderBy: { code: 'asc' },
    });

    return projects;
}
