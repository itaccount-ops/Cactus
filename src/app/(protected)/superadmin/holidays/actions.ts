'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

// Check SUPERADMIN role
async function requireSuperAdmin() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");
    // @ts-ignore
    if (session.user.role !== 'SUPERADMIN') throw new Error("Acceso denegado");
    return session.user;
}

// ============================================
// GET HOLIDAYS
// ============================================

export async function getHolidays(year: number, companyId?: string | null) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    // Get both global (companyId = null) and company-specific holidays
    const holidays = await prisma.holiday.findMany({
        where: {
            year,
            OR: [
                { companyId: null },
                { companyId: companyId ?? undefined }
            ]
        },
        orderBy: { date: 'asc' }
    });

    return holidays.map(h => ({
        id: h.id,
        date: h.date,
        name: h.name,
        type: h.type,
        year: h.year,
        companyId: h.companyId,
        isGlobal: h.companyId === null
    }));
}

// ============================================
// GET ALL HOLIDAYS FOR SUPERADMIN
// ============================================

export async function getAllHolidays(year: number) {
    await requireSuperAdmin();

    const holidays = await prisma.holiday.findMany({
        where: { year },
        orderBy: { date: 'asc' }
    });

    return holidays;
}

// ============================================
// CREATE HOLIDAY
// ============================================

export async function createHoliday(data: {
    date: string | Date;
    name: string;
    type?: string;
    companyId?: string | null;
}) {
    const user = await requireSuperAdmin();

    const dateObj = new Date(data.date);
    const year = dateObj.getFullYear();

    // Check if holiday already exists for this date
    const existing = await prisma.holiday.findFirst({
        where: {
            date: dateObj,
            companyId: data.companyId ?? null
        }
    });

    if (existing) {
        throw new Error("Ya existe un festivo para esta fecha");
    }

    const holiday = await prisma.holiday.create({
        data: {
            date: dateObj,
            name: data.name,
            type: data.type || 'NATIONAL',
            year,
            companyId: data.companyId ?? null
        }
    });

    await logActivity(user.id as string, "CREATE", "holiday", holiday.id, `Festivo creado: ${data.name} (${dateObj.toLocaleDateString()})`);

    revalidatePath('/superadmin/holidays');
    revalidatePath('/control-horas');

    return holiday;
}

// ============================================
// UPDATE HOLIDAY
// ============================================

export async function updateHoliday(id: string, data: {
    name?: string;
    type?: string;
}) {
    const user = await requireSuperAdmin();

    const holiday = await prisma.holiday.update({
        where: { id },
        data: {
            name: data.name,
            type: data.type,
            updatedAt: new Date()
        }
    });

    await logActivity(user.id as string, "UPDATE", "holiday", id, `Festivo actualizado: ${holiday.name}`);

    revalidatePath('/superadmin/holidays');
    revalidatePath('/control-horas');

    return holiday;
}

// ============================================
// DELETE HOLIDAY
// ============================================

export async function deleteHoliday(id: string) {
    const user = await requireSuperAdmin();

    const holiday = await prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new Error("Festivo no encontrado");

    await prisma.holiday.delete({ where: { id } });

    await logActivity(user.id as string, "DELETE", "holiday", id, `Festivo eliminado: ${holiday.name}`);

    revalidatePath('/superadmin/holidays');
    revalidatePath('/control-horas');

    return { success: true };
}

// ============================================
// BULK CREATE HOLIDAYS (for year initialization)
// ============================================

export async function bulkCreateHolidays(holidays: { date: string; name: string; type?: string }[], year: number) {
    const user = await requireSuperAdmin();

    const created: any[] = [];
    const skipped: string[] = [];

    for (const h of holidays) {
        const dateObj = new Date(h.date);

        // Check if already exists
        const existing = await prisma.holiday.findFirst({
            where: { date: dateObj, companyId: null }
        });

        if (existing) {
            skipped.push(h.name);
            continue;
        }

        const holiday = await prisma.holiday.create({
            data: {
                date: dateObj,
                name: h.name,
                type: h.type || 'NATIONAL',
                year,
                companyId: null
            }
        });
        created.push(holiday);
    }

    await logActivity(user.id as string, "CREATE", "holiday", `bulk-${year}`, `Festivos ${year} creados: ${created.length}, omitidos: ${skipped.length}`);

    revalidatePath('/superadmin/holidays');
    revalidatePath('/control-horas');

    return { created: created.length, skipped };
}

// ============================================
// INITIALIZE BASE HOLIDAYS
// ============================================

export async function initializeBaseHolidays(year: number, country: 'ES' | 'CA') {
    const user = await requireSuperAdmin();

    let holidays: any[] = [];

    if (country === 'ES') {
        holidays = [
            { date: `${year}-01-01`, name: 'Año Nuevo', type: 'NATIONAL' },
            { date: `${year}-01-06`, name: 'Día de reyes', type: 'NATIONAL' },
            { date: `${year}-02-28`, name: 'Día de Andalucía', type: 'REGIONAL' },
            { date: `${year}-04-02`, name: 'Jueves Santo', type: 'NATIONAL' }, // Note: Changes yearly, this is an approximation
            { date: `${year}-04-03`, name: 'Viernes Santo', type: 'NATIONAL' }, // Note: Changes yearly
            { date: `${year}-05-01`, name: 'Día del Trabajo', type: 'NATIONAL' },
            { date: `${year}-08-15`, name: 'Asunción de la Virgen', type: 'NATIONAL' },
            { date: `${year}-10-12`, name: 'Fiesta Nacional de España', type: 'NATIONAL' },
            { date: `${year}-11-01`, name: 'Día de Todos los Santos', type: 'NATIONAL' },
            { date: `${year}-12-06`, name: 'Día de la Constitución', type: 'NATIONAL' },
            { date: `${year}-12-08`, name: 'Inmaculada Concepción', type: 'NATIONAL' },
            { date: `${year}-12-25`, name: 'Navidad', type: 'NATIONAL' },
        ];
    } else if (country === 'CA') {
        holidays = [
            { date: `${year}-01-01`, name: "New Year's Day", type: 'NATIONAL' },
            { date: `${year}-04-03`, name: 'Good Friday', type: 'NATIONAL' }, // Approximate
            { date: `${year}-05-18`, name: 'Victoria Day', type: 'NATIONAL' }, // Approximate (Monday before May 25)
            { date: `${year}-07-01`, name: 'Canada Day', type: 'NATIONAL' },
            { date: `${year}-09-07`, name: 'Labour Day', type: 'NATIONAL' }, // Approximate (First Monday of Sep)
            { date: `${year}-10-12`, name: 'Thanksgiving', type: 'NATIONAL' }, // Approximate (Second Mon in Oct)
            { date: `${year}-11-11`, name: 'Remembrance Day', type: 'NATIONAL' },
            { date: `${year}-12-25`, name: 'Christmas Day', type: 'NATIONAL' },
            { date: `${year}-12-26`, name: 'Boxing Day', type: 'NATIONAL' },
        ];
    }

    return bulkCreateHolidays(holidays, year);
}

// ============================================
// COPY HOLIDAYS TO NEW YEAR
// ============================================

export async function copyHolidaysToYear(fromYear: number, toYear: number) {
    const user = await requireSuperAdmin();

    const sourceHolidays = await prisma.holiday.findMany({
        where: { year: fromYear, companyId: null }
    });

    if (sourceHolidays.length === 0) {
        throw new Error(`No hay festivos en el año ${fromYear} para copiar`);
    }

    const created: any[] = [];
    const skipped: string[] = [];

    for (const h of sourceHolidays) {
        // Adjust date to new year
        const oldDate = new Date(h.date);
        const newDate = new Date(toYear, oldDate.getMonth(), oldDate.getDate());

        // Check if already exists
        const existing = await prisma.holiday.findFirst({
            where: { date: newDate, companyId: null }
        });

        if (existing) {
            skipped.push(h.name);
            continue;
        }

        const holiday = await prisma.holiday.create({
            data: {
                date: newDate,
                name: h.name,
                type: h.type,
                year: toYear,
                companyId: null
            }
        });
        created.push(holiday);
    }

    await logActivity(user.id as string, "CREATE", "holiday", `copy-${fromYear}-${toYear}`, `Festivos copiados de ${fromYear} a ${toYear}: ${created.length}`);

    revalidatePath('/superadmin/holidays');

    return { created: created.length, skipped };
}

// ============================================
// DELETE ALL HOLIDAYS FOR YEAR
// ============================================

export async function deleteHolidaysForYear(year: number) {
    const user = await requireSuperAdmin();

    const result = await prisma.holiday.deleteMany({
        where: { year, companyId: null }
    });

    await logActivity(user.id as string, "DELETE", "holiday", `all-${year}`, `Todos los festivos de ${year} eliminados: ${result.count}`);

    revalidatePath('/superadmin/holidays');

    return { deleted: result.count };
}
