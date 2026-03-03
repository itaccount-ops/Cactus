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
    { id: 'name', title: 'Nombre', type: 'TEXT', width: 250, order: 0 },
    { id: 'code', title: 'Código', type: 'CODE', width: 120, order: 1 },
    { id: 'person', title: 'Persona', type: 'PERSON', width: 150, order: 2 },
    { id: 'status', title: 'Estado', type: 'STATUS', width: 150, order: 3 },
    { id: 'date', title: 'Fecha', type: 'DATE', width: 150, order: 4 },
    { id: 'text', title: 'Texto', type: 'TEXT', width: 250, order: 5 },
];

/* ─── getOrCreateBoard ──────────────────────────────────────────────── */
export async function getOrCreateBoard(projectId?: string | null) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };
    const companyId = (session.user as any).companyId;

    try {
        let board;
        if (projectId) {
            board = await prisma.board.findFirst({
                where: { projectId, companyId },
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
                    projectId,
                    columns: DEFAULT_COLUMNS as any,
                    groups: {
                        create: [
                            { name: 'Grupo 1', color: '#3b82f6', order: 0 },
                            { name: 'Grupo 2', color: '#8b5cf6', order: 1 },
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

        return { board, users };
    } catch (error) {
        console.error('[tablero/getOrCreateBoard]', error);
        return { error: 'Error al cargar el tablero' };
    }
}

/* ─── Columns ────────────────────────────────────────────────── */
export async function updateBoardColumns(boardId: string, columns: BoardColumn[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'No autorizado' };

    try {
        await prisma.board.update({
            where: { id: boardId },
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
            data: { boardId, name, color, order: count }
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
