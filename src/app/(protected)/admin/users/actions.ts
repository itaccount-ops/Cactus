'use server';

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { checkPermission, auditCrud } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { hash } from 'bcryptjs';

export async function getUsers(params?: {
    search?: string;
    role?: string;
    department?: string;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("users", "read");

    const {
        search = '',
        role,
        department,
        status,
        sort = 'createdAt', // 'name' | 'createdAt'
        order = 'desc', // 'asc' | 'desc'
        page = 1,
        limit = 50
    } = params || {};

    const where: any = {
        companyId: user.companyId as string,
    };

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (role && role !== 'ALL') where.role = role;
    if (department && department !== 'ALL') where.department = department;
    if (status && status !== 'ALL') where.isActive = status === 'ACTIVE';

    try {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    department: true,
                    dailyWorkHours: true,
                    hourCost: true,
                    canTrackHours: true,
                    createdAt: true,
                    image: true,
                    // HR fields for synchronization
                    employeeCode: true,
                    hireDate: true,
                    contractType: true,
                    contractEndDate: true,
                    vacationDays: true,
                    activityLogs: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { createdAt: true }
                    }
                },
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { [sort]: order }
            }),
            prisma.user.count({ where })
        ]);

        return { users, total, pages: Math.ceil(total / limit) };
    } catch (error: any) {
        console.error('Error fetching users:', error);
        // Return a mock user with the error message to display in the table
        return {
            users: [{
                id: 'error-1',
                name: `ERROR: ${error.message}`,
                email: 'Check logs',
                role: 'ERROR',
                department: 'ERROR',
                dailyWorkHours: 0,
                isActive: false,
                image: null,
                activityLogs: []
            }],
            total: 1,
            pages: 1
        };
    }
}

export async function updateUser(id: string, data: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("users", "update");

    // Get existing user for validation
    const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true, companyId: true, email: true }
    });

    if (!targetUser) throw new Error("Usuario no encontrado");
    if (targetUser.companyId !== user.companyId) throw new Error("Usuario no pertenece a tu empresa");

    // CRITICAL: Protect GUEST user
    const GUEST_EMAIL = 'invitado@sistema.local';
    if (targetUser.email === GUEST_EMAIL) {
        if (data.role && data.role !== targetUser.role) {
            throw new Error('No se puede cambiar el rol del usuario del sistema (GUEST)');
        }
        if (data.email && data.email !== targetUser.email) {
            throw new Error('No se puede cambiar el email del usuario del sistema (GUEST)');
        }
    }

    // MANAGER restrictions
    if (user.role === 'MANAGER') {
        if (['ADMIN', 'MANAGER'].includes(targetUser.role)) {
            throw new Error('Managers no pueden editar Admin o Manager');
        }
        if (['ADMIN', 'MANAGER'].includes(data.role)) {
            throw new Error('Managers no pueden promover a Admin o Manager');
        }
    }

    if (data.email) {
        const existing = await prisma.user.findFirst({
            where: {
                email: data.email,
                NOT: { id },
                companyId: user.companyId as string
            }
        });
        if (existing) throw new Error('Email ya está en uso');
    }

    try {
        const updated = await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                department: data.department,
                isActive: data.isActive,
                canTrackHours: data.canTrackHours ?? true,
                dailyWorkHours: typeof data.dailyWorkHours === 'string'
                    ? parseFloat(data.dailyWorkHours)
                    : data.dailyWorkHours || 8.0,
                hourCost: data.hourCost ? parseFloat(data.hourCost) : null,
                ...(data.image !== undefined && { image: data.image || null }),
            }
        });

        await auditCrud('UPDATE', 'User', id, { before: targetUser, after: updated });
        revalidatePath('/admin/users');

        // Serialize Decimal field for client
        return {
            ...updated,
            salary: updated.salary ? Number(updated.salary) : null,
            hourCost: updated.hourCost ? Number(updated.hourCost) : null
        };
    } catch (error: any) {
        console.error("Error updating user:", error);
        throw new Error("Error al actualizar usuario: " + error.message);
    }
}

export async function adminChangeUserPassword(targetUserId: string, newPassword: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    // Only ADMIN and SUPERADMIN can use this
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
        throw new Error("No tienes permisos para cambiar contraseñas de otros usuarios");
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true, email: true }
    });

    if (!targetUser) throw new Error("Usuario no encontrado");
    if (targetUser.companyId !== user.companyId) throw new Error("Usuario no pertenece a tu empresa");

    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
        where: { id: targetUserId },
        data: { passwordHash: hashedPassword }
    });

    await auditCrud('UPDATE', 'User', targetUserId, { action: 'admin_password_reset', by: user.id });
    revalidatePath('/admin/users');

    return { success: true, message: 'Contraseña actualizada correctamente' };
}

export async function inviteUser(data: {
    name: string;
    email: string;
    role: string;
    department: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("users", "create");

    // MANAGER restrictions
    if (user.role === 'MANAGER') {
        if (['ADMIN', 'MANAGER'].includes(data.role)) {
            throw new Error('Managers no pueden invitar Admins o Managers');
        }
    }

    const existing = await prisma.user.findFirst({
        where: {
            email: data.email,
            companyId: user.companyId as string
        }
    });
    if (existing) throw new Error('Usuario ya existe');

    const hashedPassword = await hash('Mep1234!', 10); // Default password

    try {
        const newUser = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                role: data.role as any,
                department: data.department as any,
                passwordHash: hashedPassword,
                isActive: true,
                dailyWorkHours: 8.0,
                companyId: user.companyId as string,
            }
        });

        await auditCrud('CREATE', 'User', newUser.id, newUser);
        revalidatePath('/admin/users');

        return newUser;
    } catch (error: any) {
        console.error("Error creating user:", error);
        throw new Error("Error al crear usuario: " + error.message);
    }
}

export async function deleteUser(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("users", "delete");

    const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true, companyId: true, email: true }
    });

    if (!targetUser) throw new Error("Usuario no encontrado");
    if (targetUser.companyId !== user.companyId) throw new Error("Usuario no pertenece a tu empresa");

    // CRITICAL: Cannot delete GUEST user
    const GUEST_EMAIL = 'invitado@sistema.local';
    if (targetUser.email === GUEST_EMAIL || targetUser.role === 'GUEST') {
        throw new Error('No se puede eliminar el usuario del sistema (GUEST). Este usuario es necesario para el modo demo.');
    }

    // Cannot delete own account
    if (id === user.id) throw new Error("No puedes eliminar tu propia cuenta");

    // Only ADMIN or SUPERADMIN can delete other users
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
        throw new Error("Solo ADMIN o SUPERADMIN puede eliminar usuarios");
    }

    try {
        await prisma.user.delete({
            where: { id }
        });

        await auditCrud('DELETE', 'User', id, targetUser);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        if (error.code === 'P2003') {
            throw new Error("No se puede eliminar el usuario porque tiene datos asociados (proyectos, tareas, etc.)");
        }
        throw new Error("Error al eliminar usuario: " + error.message);
    }
}

/**
 * Obtener usuario por ID con permisos
 */
export async function getUserById(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("users", "read");

    // @ts-ignore
    const targetUser = await (prisma.user as any).findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            companyId: true,
            isActive: true,
            dailyWorkHours: true,
            hourCost: true,
            createdAt: true,
            updatedAt: true,
            permissions: {
                select: {
                    id: true,
                    resource: true,
                    action: true,
                    granted: true,
                },
            },
            managedTeams: {
                select: {
                    id: true,
                    name: true,
                },
            },
            memberOfTeams: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!targetUser) {
        throw new Error("Usuario no encontrado");
    }

    return targetUser;
}

/**
 * Obtener permisos granulares del usuario
 */
export async function getUserPermissions(userId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("permissions", "read");

    const permissions = await (prisma as any).permission.findMany({
        where: { userId },
        orderBy: { resource: "asc" },
    });

    return permissions;
}

/**
 * Actualizar permisos granulares de un usuario
 */
export async function updateUserPermissions(
    userId: string,
    permissions: Array<{
        resource: string;
        action: string;
        granted: boolean | null; // null = usar default (no override)
    }>
) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("permissions", "update");

    // Eliminar permisos existentes del usuario
    await (prisma as any).permission.deleteMany({
        where: { userId },
    });

    // Crear nuevos permisos (solo los que sean override explícito, no null)
    const permissionsToCreate = permissions.filter(p => p.granted !== null);

    if (permissionsToCreate.length > 0) {
        await (prisma as any).permission.createMany({
            data: permissionsToCreate.map(p => ({
                userId,
                resource: p.resource,
                action: p.action,
                granted: p.granted,
            })),
        });
    }

    await auditCrud('UPDATE', 'Permissions', userId, {
        count: permissions.length,
        overrides: permissionsToCreate.length
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return { success: true, count: permissionsToCreate.length };
}

/**
 * Cambiar contraseña de usuario
 */
export async function changeUserPassword(id: string, newPassword: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("No autenticado");

    await checkPermission("users", "update");

    const passwordHash = await hash(newPassword, 12);

    await prisma.user.update({
        where: { id },
        data: { passwordHash },
    });

    await auditCrud('UPDATE', 'User', id, { action: 'password_changed' });

    return { success: true };
}
