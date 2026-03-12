'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { MODULE_KEYS, type ModuleKey } from './module-constants';

/**
 * Returns module access record for the currently logged-in user.
 * SUPERADMIN / ADMIN → always all true.
 * Others → true by default unless an explicit `granted: false` override exists.
 */
export async function getMyModuleAccess(): Promise<Record<string, boolean>> {
    const session = await auth();
    if (!session?.user) return {};

    const role = (session.user as any).role as string;
    // Admins always see everything
    if (['SUPERADMIN', 'ADMIN'].includes(role)) {
        return Object.fromEntries(MODULE_KEYS.map(k => [k, true]));
    }

    const userId = session.user.id as string;
    return getUserModuleAccess(userId);
}

/**
 * Returns module access record for a specific user (for admins to display/edit).
 */
export async function getUserModuleAccess(userId: string): Promise<Record<string, boolean>> {
    // Fetch all module permission overrides for this user
    const overrides = await prisma.permission.findMany({
        where: {
            userId,
            resource: { startsWith: 'module:' } as any,
            action: 'read',
        },
    });

    const overrideMap = Object.fromEntries(
        overrides.map(o => [o.resource.replace('module:', ''), o.granted])
    );

    // Build final access: default true unless explicitly false
    return Object.fromEntries(
        MODULE_KEYS.map(k => [k, overrideMap[k] !== false])
    );
}

/**
 * Set (or remove) a module access override for a user.
 * If `granted` is true and it's the default, removes the override to keep DB clean.
 */
export async function setUserModuleAccess(
    userId: string,
    moduleKey: ModuleKey,
    granted: boolean
): Promise<void> {
    const resource = `module:${moduleKey}`;

    if (granted) {
        // Default is true → remove any deny override
        await prisma.permission.deleteMany({
            where: { userId, resource, action: 'read' },
        });
    } else {
        // Explicitly deny
        await prisma.permission.upsert({
            where: { userId_resource_action: { userId, resource, action: 'read' } },
            update: { granted: false },
            create: { userId, resource, action: 'read', granted: false },
        });
    }
}

/**
 * Bulk update all module accesses for a user at once.
 */
export async function setAllUserModuleAccess(
    userId: string,
    access: Record<string, boolean>
): Promise<void> {
    await Promise.all(
        MODULE_KEYS.map(k =>
            setUserModuleAccess(userId, k, access[k] !== false)
        )
    );
}
