'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/(protected)/notifications/actions";

export type ColumnType = 'TEXT' | 'STATUS' | 'DATE' | 'PERSON' | 'CODE';

export interface BoardColumn {
    id: string;
    title: string;
    type: ColumnType;
    width?: number;
    order: number;
}

const DEFAULT_COLUMNS: BoardColumn[] = [
    { id: 'status', title: 'Estado', type: 'STATUS', width: 150, order: 0 },
    { id: 'person', title: 'Persona', type: 'PERSON', width: 150, order: 1 },
    { id: 'date', title: 'Fecha', type: 'DATE', width: 150, order: 2 },
    { id: 'text', title: 'Texto', type: 'TEXT', width: 250, order: 3 },
];

/* ─── getOrCreateBoard ──────────────────────────────────────────────── */
export async function getOrCreateBoard(projectId?: string | null) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };
    const companyId = (session.user as any).companyId;

    try {
        let board: any;
        if (projectId) {
            board = await prisma.board.findFirst({
                where: { projectId, companyId },
                include: {
                    project: { select: { name: true } },
                    groups: {
                        orderBy: { order: 'asc' },
                        include: {
                            items: {
                                orderBy: { order: 'asc' },
                                include: { subitems: { orderBy: { order: 'asc' } } }
                            }
                        }
                    }
                }
            });
        } else {
            board = await prisma.board.findFirst({
                where: { projectId: null, companyId },
                include: {
                    groups: {
                        orderBy: { order: 'asc' },
                        include: {
                            items: {
                                orderBy: { order: 'asc' },
                                include: { subitems: { orderBy: { order: 'asc' } } }
                            }
                        }
                    }
                }
            });
        }

        if (!board) {
            // Create default board
            board = await prisma.board.create({
                data: {
                    name: projectId ? 'Tablero del Proyecto' : 'Tablero Principal',
                    companyId,
                    projectId: projectId || null,
                    groups: {
                        create: [
                            { name: 'Grupo 1', color: '#3b82f6', order: 0, columns: DEFAULT_COLUMNS as any }
                        ]
                    }
                },
                include: {
                    groups: {
                        orderBy: { order: 'asc' },
                        include: {
                            items: {
                                orderBy: { order: 'asc' },
                                include: { subitems: { orderBy: { order: 'asc' } } }
                            }
                        }
                    }
                }
            });
        }

        // Fetch users for 'PERSON' columns
        const users = await prisma.user.findMany({
            where: { isActive: true, companyId },
            select: { id: true, name: true, image: true, email: true },
            orderBy: { name: 'asc' }
        });

        // Inject DEFAULT_COLUMNS if missing due to legacy migrated boards
        if (board && board.groups) {
            for (const group of board.groups) {
                if (!group.columns || (Array.isArray(group.columns) && group.columns.length === 0)) {
                    group.columns = DEFAULT_COLUMNS;
                    // Auto-sync it asynchronously in background to avoid empty DB states
                    prisma.boardGroup.update({ where: { id: group.id }, data: { columns: DEFAULT_COLUMNS as any } }).catch(() => { });
                }
            }
        }

        return { board, users };
    } catch (error) {
        console.error('[tablero/getOrCreateBoard]', error);
        return { error: 'Error al cargar el tablero' };
    }
}

/* ─── Columns ────────────────────────────────────────────────── */
export async function updateGroupColumns(groupId: string, columns: BoardColumn[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardGroup.update({
            where: { id: groupId },
            data: { columns: columns as any }
        });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al actualizar columnas' };
    }
}

/* ─── Groups ─────────────────────────────────────────────────── */
export async function createGroup(boardId: string, name: string, color: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const count = await prisma.boardGroup.count({ where: { boardId } });
        const group = await prisma.boardGroup.create({
            data: { boardId, name, color, order: count, columns: DEFAULT_COLUMNS as any }
        });
        revalidatePath('/tablero');
        return { success: true, group };
    } catch (error) {
        return { error: 'Error al crear grupo' };
    }
}

export async function updateGroup(groupId: string, data: { name?: string; color?: string; order?: number }) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardGroup.update({ where: { id: groupId }, data });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al actualizar grupo' };
    }
}

export async function deleteGroup(groupId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardGroup.delete({ where: { id: groupId } });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al eliminar grupo' };
    }
}

/* ─── Items ──────────────────────────────────────────────────── */
export async function createItem(groupId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const count = await prisma.boardItem.count({ where: { groupId } });
        const item = await prisma.boardItem.create({
            data: { groupId, name, values: {}, order: count },
            include: { subitems: true }
        });
        revalidatePath('/tablero');
        return { success: true, item };
    } catch (error) {
        return { error: 'Error al crear ítem' };
    }
}

export async function updateItemName(itemId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardItem.update({ where: { id: itemId }, data: { name } });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al actualizar nombre del ítem' };
    }
}

export async function updateItemValue(itemId: string, columnId: string, value: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const item = await prisma.boardItem.findUnique({ where: { id: itemId } });
        if (!item) return { error: 'Ítem no encontrado' };

        const currentValues = (item.values as Record<string, any>) || {};
        const newValues = { ...currentValues, [columnId]: value };

        await prisma.boardItem.update({
            where: { id: itemId },
            data: { values: newValues }
        });

        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al actualizar valor' };
    }
}

export async function deleteItem(itemId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardItem.delete({ where: { id: itemId } });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al eliminar ítem' };
    }
}

export async function reorderItem(itemId: string, targetGroupId: string, newOrder: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const item = await prisma.boardItem.findUnique({ where: { id: itemId } });
        if (!item) return { error: 'Ítem no encontrado' };

        const oldGroupId = item.groupId;

        // Move execution inside a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update the item's group and temporary order
            await tx.boardItem.update({
                where: { id: itemId },
                data: { groupId: targetGroupId, order: newOrder }
            });

            // 2. Re-sequence the old group if it moved out
            if (oldGroupId !== targetGroupId) {
                const oldItems = await tx.boardItem.findMany({
                    where: { groupId: oldGroupId, id: { not: itemId } },
                    orderBy: { order: 'asc' }
                });
                for (let i = 0; i < oldItems.length; i++) {
                    await tx.boardItem.update({
                        where: { id: oldItems[i].id },
                        data: { order: i }
                    });
                }
            }

            // 3. Re-sequence the new group
            const newItems = await tx.boardItem.findMany({
                where: { groupId: targetGroupId },
                orderBy: { order: 'asc' }
            });
            // Make sure there are no duplicates by enforcing absolute order
            const sorted = newItems.sort((a: any, b: any) => {
                if (a.id === itemId) return -1; // Temp priority for sorting resolution if same index
                if (b.id === itemId) return 1;
                return a.order - b.order;
            });

            // We need to place itemId exactly at newOrder idx
            const filtered = sorted.filter((x: any) => x.id !== itemId);
            filtered.splice(newOrder, 0, item); // Insert at exact position

            for (let i = 0; i < filtered.length; i++) {
                await tx.boardItem.update({
                    where: { id: filtered[i].id },
                    data: { order: i }
                });
            }
        });

        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        console.error('[tablero/reorderItem]', error);
        return { error: 'Error al reordenar ítem' };
    }
}

/* ─── Subitems ───────────────────────────────────────────────── */
export async function createSubitem(itemId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const count = await prisma.boardSubitem.count({ where: { itemId } });
        const subitem = await prisma.boardSubitem.create({
            data: { itemId, name, values: {}, order: count }
        });
        revalidatePath('/tablero');
        return { success: true, subitem };
    } catch (error) {
        return { error: 'Error al crear subítem' };
    }
}

export async function updateSubitemName(subitemId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardSubitem.update({ where: { id: subitemId }, data: { name } });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al actualizar nombre del subítem' };
    }
}

export async function updateSubitemValue(subitemId: string, columnId: string, value: any) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        const subitem = await prisma.boardSubitem.findUnique({ where: { id: subitemId } });
        if (!subitem) return { error: 'Subítem no encontrado' };

        const currentValues = (subitem.values as Record<string, any>) || {};
        const newValues = { ...currentValues, [columnId]: value };

        await prisma.boardSubitem.update({
            where: { id: subitemId },
            data: { values: newValues }
        });

        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al actualizar valor' };
    }
}

export async function deleteSubitem(subitemId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.boardSubitem.delete({ where: { id: subitemId } });
        revalidatePath('/tablero');
        return { success: true };
    } catch (error) {
        return { error: 'Error al eliminar subítem' };
    }
}

/* ─── My Work (Global View) ──────────────────────────────────── */
export async function getMyWorkBoard() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    const userId = session.user.id;
    const companyId = (session.user as any).companyId;

    try {
        const allBoards = await prisma.board.findMany({
            where: { companyId },
            include: {
                groups: {
                    include: {
                        items: { include: { subitems: true } }
                    }
                }
            }
        });

        const myItems: any[] = [];

        for (const board of allBoards) {
            for (const group of board.groups) {
                const groupCols = (group.columns as unknown as BoardColumn[]) || [];
                const personColIds = groupCols.filter(c => c.type === 'PERSON').map(c => c.id);
                const dateColIds = groupCols.filter(c => c.type === 'DATE').map(c => c.id);

                for (const item of group.items) {
                    const values = (item.values as any) || {};
                    let isAssigned = false;
                    for (const pid of personColIds) {
                        const val = values[pid];
                        if (Array.isArray(val) && val.includes(userId)) {
                            isAssigned = true;
                            break;
                        } else if (val === userId) {
                            isAssigned = true;
                            break;
                        }
                    }

                    if (isAssigned) {
                        let dateVal = null;
                        for (const did of dateColIds) {
                            if (values[did]) {
                                dateVal = values[did];
                                break;
                            }
                        }

                        myItems.push({
                            ...item,
                            myWorkDate: dateVal,
                            context: `${board.name} > ${group.name}`,
                            myWorkColumns: groupCols
                        });
                    }
                }
            }
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const getWeekNumber = (d: Date) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };

        const currentWeek = getWeekNumber(now);

        const syntheticGroups: any[] = [
            { id: 'g_past', name: 'Fechas pasadas', color: '#e11d48', order: 0, items: [], columns: DEFAULT_COLUMNS },
            { id: 'g_today', name: 'Hoy', color: '#16a34a', order: 1, items: [], columns: DEFAULT_COLUMNS },
            { id: 'g_this_week', name: 'Esta semana', color: '#2563eb', order: 2, items: [], columns: DEFAULT_COLUMNS },
            { id: 'g_next_week', name: 'La próxima semana', color: '#0284c7', order: 3, items: [], columns: DEFAULT_COLUMNS },
            { id: 'g_later', name: 'Más tarde', color: '#d97706', order: 4, items: [], columns: DEFAULT_COLUMNS },
            { id: 'g_no_date', name: 'Sin fecha', color: '#475569', order: 5, items: [], columns: DEFAULT_COLUMNS },
        ];

        for (const item of myItems) {
            item.columns = item.myWorkColumns;
            if (!item.myWorkDate) {
                syntheticGroups[5].items.push(item);
                continue;
            }

            const itemDate = new Date(item.myWorkDate);
            itemDate.setHours(0, 0, 0, 0);

            if (itemDate < now) {
                syntheticGroups[0].items.push(item);
            } else if (itemDate.getTime() === now.getTime()) {
                syntheticGroups[1].items.push(item);
            } else {
                const itemWeek = getWeekNumber(itemDate);
                if (itemDate.getFullYear() === now.getFullYear() && itemWeek === currentWeek) {
                    syntheticGroups[2].items.push(item);
                } else if (itemDate.getFullYear() === now.getFullYear() && itemWeek === currentWeek + 1) {
                    syntheticGroups[3].items.push(item);
                } else {
                    syntheticGroups[4].items.push(item);
                }
            }
        }

        const users = await prisma.user.findMany({
            where: { isActive: true, companyId },
            select: { id: true, name: true, image: true, email: true },
            orderBy: { name: 'asc' }
        });

        return {
            board: {
                id: 'my-work',
                name: 'Mi trabajo',
                groups: syntheticGroups,
                isMyWork: true,
                columns: []
            },
            users
        };

    } catch (error) {
        console.error('[tablero/getMyWorkBoard]', error);
        return { error: 'Error al cargar Mi Trabajo' };
    }
}
