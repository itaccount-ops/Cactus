'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { TaskStateMachine } from "@/lib/state-machine";
import { createNotification } from "@/app/(protected)/notifications/actions";

/* ─── getTableroData ─────────────────────────────────────────────────── */
export async function getTableroData() {
    const session = await auth();
    if (!session?.user?.id) return { tasks: [], users: [] };

    const userId   = session.user.id;
    const userRole = (session.user as any).role  as string;
    const companyId= (session.user as any).companyId as string | null;

    // Build task visibility scope (mirrors tasks/actions.ts logic)
    const taskWhere: any = {};
    if (!['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        taskWhere.OR = [
            { assignedToId: userId },
            { assignees: { some: { id: userId } } },
            { createdById: userId },
        ];
    }

    const [tasks, users] = await Promise.all([
        prisma.task.findMany({
            where: taskWhere,
            include: {
                assignedTo:  { select: { id: true, name: true, email: true, image: true } },
                assignees:   { select: { id: true, name: true, email: true, image: true } },
                createdBy:   { select: { id: true, name: true, image: true } },
                project:     { select: { id: true, code: true, name: true } },
                labels:      { orderBy: { createdAt: 'asc' } },
                checklistItems: { select: { id: true, completed: true } },
                _count:      { select: { comments: true, attachments: true } },
            },
            orderBy: [
                { status: 'asc' },
                { priority: 'desc' },
                { dueDate: 'asc' },
            ],
        } as any),
        companyId
            ? prisma.user.findMany({
                  where: { companyId, isActive: true },
                  select: { id: true, name: true, email: true, image: true, role: true },
                  orderBy: { name: 'asc' },
              })
            : prisma.user.findMany({
                  where: { isActive: true },
                  select: { id: true, name: true, email: true, image: true, role: true },
                  orderBy: { name: 'asc' },
              }),
    ]);

    return { tasks, users };
}

/* ─── updateTaskField ────────────────────────────────────────────────── */
export async function updateTaskField(taskId: string, field: string, value: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                id: true, title: true, status: true,
                assignedToId: true, createdById: true,
                assignees: { select: { id: true } },
            },
        });
        if (!task) return { error: 'Tarea no encontrada' };

        // Authorization check
        const userRole = (session.user as any).role as string;
        const canEdit  =
            ['ADMIN', 'SUPERADMIN'].includes(userRole) ||
            task.createdById === session.user.id ||
            task.assignedToId === session.user.id ||
            task.assignees.some((a: any) => a.id === session.user.id);

        if (!canEdit) return { error: 'No tienes permiso para editar esta tarea' };

        const updateData: any = {};

        switch (field) {
            case 'status': {
                // Validate transition via state machine
                try {
                    TaskStateMachine.transition(task.status, value);
                } catch (err: any) {
                    return { error: err.message ?? 'Transición de estado no permitida' };
                }
                updateData.status = value;
                if (value === 'COMPLETED') updateData.completedAt = new Date();
                if (value !== 'COMPLETED') updateData.completedAt = null;

                // Notify creator when status changes (if not self)
                if (task.createdById !== session.user.id) {
                    const cfg: Record<string, string> = {
                        COMPLETED:   `${session.user.name} completó la tarea: "${task.title}"`,
                        CANCELLED:   `${session.user.name} canceló la tarea: "${task.title}"`,
                        IN_PROGRESS: `${session.user.name} puso en curso: "${task.title}"`,
                    };
                    if (cfg[value]) {
                        await createNotification({
                            userId: task.createdById,
                            type: 'TASK_COMPLETED',
                            title: 'Actualización de tarea',
                            message: cfg[value],
                            link: `/tablero`,
                            senderId: session.user.id,
                        });
                    }
                }
                break;
            }

            case 'priority': {
                updateData.priority = value;
                break;
            }

            case 'dueDate': {
                updateData.dueDate = value ? new Date(value) : null;
                break;
            }

            case 'title': {
                const trimmed = (value as string)?.trim();
                if (!trimmed) return { error: 'El título no puede estar vacío' };
                updateData.title = trimmed;
                break;
            }

            case 'assignedToId': {
                const newAssigneeId = value || null;
                updateData.assignedToId = newAssigneeId;

                if (newAssigneeId) {
                    // Add new assignee to the many-to-many relation if not already there
                    const alreadyAssigned = task.assignees.some((a: any) => a.id === newAssigneeId);
                    if (!alreadyAssigned) {
                        updateData.assignees = { connect: { id: newAssigneeId } };
                    }

                    // Notify new assignee (if not self)
                    if (newAssigneeId !== session.user.id) {
                        await createNotification({
                            userId: newAssigneeId,
                            type: 'TASK_ASSIGNED',
                            title: 'Nueva tarea asignada',
                            message: `${session.user.name} te asignó: "${task.title}"`,
                            link: `/tablero`,
                            senderId: session.user.id,
                        });
                    }
                } else {
                    // Remove old primary assignee from many-to-many if they were the only assignee
                    if (task.assignedToId && task.assignees.length === 1 && task.assignees[0].id === task.assignedToId) {
                        updateData.assignees = { disconnect: { id: task.assignedToId } };
                    }
                }
                break;
            }

            default:
                return { error: `Campo '${field}' no permitido` };
        }

        await prisma.task.update({ where: { id: taskId }, data: updateData });

        revalidatePath('/tablero');
        revalidatePath('/tasks');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('[tablero/updateTaskField]', error);
        return { error: 'Error interno al actualizar la tarea' };
    }
}

/* ─── createTableroTask ──────────────────────────────────────────────── */
export async function createTableroTask(data: {
    title: string;
    projectId?: string | null;
    priority?: string;
    status?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    const title = data.title?.trim();
    if (!title) return { error: 'El título es requerido' };

    try {
        const task = await prisma.task.create({
            data: {
                title,
                priority:    (data.priority as any) ?? 'MEDIUM',
                status:      (data.status as any)   ?? 'PENDING',
                type:        'GENERAL',
                createdById: session.user.id,
                assignedToId: session.user.id,
                projectId:   data.projectId ?? null,
                assignees:   { connect: [{ id: session.user.id }] },
            } as any,
            include: {
                assignedTo:     { select: { id: true, name: true, email: true, image: true } },
                assignees:      { select: { id: true, name: true, email: true, image: true } },
                createdBy:      { select: { id: true, name: true, image: true } },
                project:        { select: { id: true, code: true, name: true } },
                labels:         { orderBy: { createdAt: 'asc' } },
                checklistItems: { select: { id: true, completed: true } },
                _count:         { select: { comments: true, attachments: true } },
            } as any,
        });

        revalidatePath('/tablero');
        revalidatePath('/tasks');
        revalidatePath('/dashboard');
        return { success: true, task };
    } catch (error) {
        console.error('[tablero/createTableroTask]', error);
        return { error: 'Error al crear la tarea' };
    }
}

/* ─── deleteTableroTask ──────────────────────────────────────────────── */
export async function deleteTableroTask(taskId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const task = await prisma.task.findUnique({
            where:  { id: taskId },
            select: { id: true, title: true, createdById: true },
        });
        if (!task) return { error: 'Tarea no encontrada' };

        const userRole = (session.user as any).role as string;
        if (!['ADMIN', 'SUPERADMIN'].includes(userRole) && task.createdById !== session.user.id) {
            return { error: 'Solo puedes eliminar tareas que hayas creado' };
        }

        await prisma.task.delete({ where: { id: taskId } });

        revalidatePath('/tablero');
        revalidatePath('/tasks');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('[tablero/deleteTableroTask]', error);
        return { error: 'Error al eliminar la tarea' };
    }
}
