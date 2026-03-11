import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from 'next/navigation';

/**
 * Helper para obtener información completa del usuario autenticado
 * Incluye companyId que no está en el tipo de sesión por defecto
 */
export async function getAuthenticatedUser() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            companyId: true,
        },
    });

    if (!user) {
        redirect('/login');
    }

    return user;
}

/**
 * Helper para obtener solo el companyId del usuario
 */
export async function getUserCompanyId(): Promise<string> {
    const user = await getAuthenticatedUser();
    if (!user.companyId) {
        throw new Error("Usuario sin empresa asignada");
    }
    return user.companyId;
}
