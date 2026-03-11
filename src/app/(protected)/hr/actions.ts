'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath, unstable_cache } from 'next/cache';
import {
    validateAbsenceRequest,
    countWorkingDays,
    type AbsenceTypeKey,
    type Holiday,
} from '@/lib/absence-rules-engine';

// Helper to convert Prisma Decimal to number for client serialization
function serializePayrollRecord(record: any) {
    return {
        ...record,
        baseSalary: record.baseSalary ? Number(record.baseSalary) : null,
        overtime: record.overtime ? Number(record.overtime) : null,
        bonuses: record.bonuses ? Number(record.bonuses) : null,
        deductions: record.deductions ? Number(record.deductions) : null,
        netSalary: record.netSalary ? Number(record.netSalary) : null,
        user: record.user ? {
            ...record.user,
            salary: record.user.salary ? Number(record.user.salary) : null
        } : record.user
    };
}

// ============================================
// EMPLOYEE HR DATA MANAGEMENT
// ============================================

/**
 * Get all employees with HR data (for HR managers)
 */
export async function getEmployeesWithHRData() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!user) throw new Error('Usuario no encontrado');

    // Only ADMIN, MANAGER can view HR data
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
        throw new Error('No tienes permisos para ver datos de RRHH');
    }

    // Get ALL employees (including inactive) — scoped to same company
    const employees = await prisma.user.findMany({
        where: { companyId: user.companyId ?? undefined },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            department: true,
            employeeCode: true,
            hireDate: true,
            contractType: true,
            contractEndDate: true,
            vacationDays: true,
            isActive: true,
            createdAt: true,
            departmentMemberships: {
                select: { id: true, department: true }
            },
            isDirective: true,
            _count: {
                select: { absences: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    return employees;
}

/**
 * Update HR data for an employee
 */
export async function updateEmployeeHRData(
    userId: string,
    data: {
        employeeCode?: string;
        hireDate?: Date;
        contractType?: 'INDEFINIDO' | 'TEMPORAL' | 'OBRA_SERVICIO' | 'PRACTICAS' | 'FORMACION';
        contractEndDate?: Date | null;
        salary?: number;
        bankAccount?: string;
        ssNumber?: string;
        emergencyContact?: { name: string; phone: string; relation: string };
        vacationDays?: number;
    }
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN can update HR data
    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para actualizar datos de RRHH');
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            employeeCode: data.employeeCode,
            hireDate: data.hireDate,
            contractType: data.contractType,
            contractEndDate: data.contractEndDate,
            salary: data.salary,
            bankAccount: data.bankAccount,
            ssNumber: data.ssNumber,
            emergencyContact: data.emergencyContact,
            vacationDays: data.vacationDays
        }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/employees');

    // Serialize Decimal field for client
    return {
        ...updated,
        salary: updated.salary ? Number(updated.salary) : null
    };
}

/**
     * Generate next employee code
     */
export async function generateEmployeeCode(): Promise<string> {
    const lastEmployee = await prisma.user.findFirst({
        where: {
            employeeCode: { not: null }
        },
        orderBy: { employeeCode: 'desc' },
        select: { employeeCode: true }
    });

    if (!lastEmployee?.employeeCode) {
        return 'EMP-001';
    }

    const match = lastEmployee.employeeCode.match(/EMP-(\d+)/);
    if (!match) return 'EMP-001';

    const nextNumber = parseInt(match[1], 10) + 1;
    return `EMP-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Toggle employee active/inactive status
 */
export async function toggleEmployeeActive(userId: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN can toggle employee status
    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para cambiar el estado del empleado');
    }

    // Get current status
    const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true, name: true }
    });
    if (!employee) throw new Error('Empleado no encontrado');

    // Toggle status
    const updated = await prisma.user.update({
        where: { id: userId },
        data: { isActive: !employee.isActive }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/employees');
    revalidatePath(`/hr/employees/${userId}`);

    return {
        isActive: updated.isActive,
        message: updated.isActive ? 'Empleado activado' : 'Empleado desactivado'
    };
}

/**
 * Update employee salary (restricted to ADMIN only)
 */
export async function updateEmployeeSalary(userId: string, salary: number) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN can update salary
    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para modificar el salario');
    }

    if (salary < 0) throw new Error('El salario no puede ser negativo');

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { salary }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/employees');
    revalidatePath(`/hr/employees/${userId}`);

    // Serialize Decimal field for client
    return { salary: updated.salary ? Number(updated.salary) : null };
}

/**
 * Get single employee by ID with full HR data
 */
export async function getEmployeeById(userId: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN, MANAGER can view HR data
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver datos de RRHH');
    }

    const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            department: true,
            dailyWorkHours: true,
            isActive: true,
            createdAt: true,
            // HR fields
            employeeCode: true,
            hireDate: true,
            contractType: true,
            contractEndDate: true,
            salary: true,
            bankAccount: true,
            ssNumber: true,
            emergencyContact: true,
            vacationDays: true,
            isDirective: true,
            departmentMemberships: {
                select: { id: true, department: true }
            },
            // Relations
            absences: {
                take: 10,
                orderBy: { startDate: 'desc' },
                select: {
                    id: true,
                    type: true,
                    startDate: true,
                    endDate: true,
                    totalDays: true,
                    status: true
                }
            },
            memberOfTeams: {
                select: { id: true, name: true }
            }
        }
    });

    if (!employee) throw new Error('Empleado no encontrado');

    // Convert Decimal to number for client serialization
    return {
        ...employee,
        salary: employee.salary ? Number(employee.salary) : null
    };
}

// ======================================
// HELPER: Fetch holidays for rules engine
// ======================================

/**
 * Fetches holidays for a calendar year, cached for 1 hour.
 * Cache is tagged per company so it can be invalidated when holidays change.
 */
function getCachedHolidaysForYear(year: number, companyId: string | null) {
    const tag = `holidays:${companyId ?? 'global'}:${year}`;
    return unstable_cache(
        async () => {
            const yearStart = new Date(`${year}-01-01`);
            const yearEnd = new Date(`${year}-12-31`);
            const rows = await prisma.holiday.findMany({
                where: { companyId: companyId ?? null, date: { gte: yearStart, lte: yearEnd } },
                select: { date: true },
            });
            return rows.map(r => ({ date: r.date.toISOString().split('T')[0] }));
        },
        [tag],
        { revalidate: 3600, tags: [tag] }
    )();
}

async function fetchHolidaysForRange(
    start: Date,
    end: Date,
    companyId?: string | null
): Promise<Holiday[]> {
    // Collect holidays for all years spanned by the range (usually just one)
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const results: Holiday[] = [];
    for (let y = startYear; y <= endYear; y++) {
        const h = await getCachedHolidaysForYear(y, companyId ?? null);
        results.push(...h);
    }
    // Filter to exact range
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return results.filter(h => h.date >= startStr && h.date <= endStr);
}

/**
 * Request an absence (vacation, sick leave, etc.)
 * Delegates all business rule validation to the absence-rules-engine.
 */
export async function requestAbsence(data: {
    type: AbsenceTypeKey;
    startDate: Date;
    endDate: Date;
    reason?: string;
    hours?: number;
    startTime?: string;
    endTime?: string;
    attachmentUrl?: string;
    isLateNotice?: boolean;
    isHrOverride?: boolean;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true, name: true, companyId: true, role: true,
            vacationDays: true, personalDays: true,
            looseVacationDaysUsed: true, looseVacationDaysWithoutNotice: true,
            childSicknessHoursBank: true, hireDate: true,
        }
    });
    if (!user) throw new Error('Usuario no encontrado');

    // Only ADMIN/SUPERADMIN may use HR override
    const isHrOverride = data.isHrOverride &&
        ['SUPERADMIN', 'ADMIN'].includes(user.role);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const currentYear = start.getFullYear();
    const yearStart = new Date(`${currentYear}-01-01`);
    const yearEnd = new Date(`${currentYear}-12-31`);

    // Fetch holidays for the engine (and year-wide for balance recomputation)
    const [holidays, yearHolidays] = await Promise.all([
        fetchHolidaysForRange(start, end, user.companyId),
        getCachedHolidaysForYear(currentYear, user.companyId ?? null),
    ]);

    // Fetch existing absences for the year and recompute working days precisely
    // (mirrors getVacationBalance — avoids stale totalDays values)
    const yearAbsences = await prisma.absence.findMany({
        where: {
            userId: user.id,
            status: { in: ['APPROVED', 'PENDING'] },
            startDate: { gte: yearStart, lte: yearEnd },
        },
        select: { type: true, startDate: true, endDate: true },
    });

    const recount = (type: string) =>
        yearAbsences
            .filter(a => a.type === type)
            .reduce((sum, a) => sum + countWorkingDays(new Date(a.startDate), new Date(a.endDate), yearHolidays), 0);

    const existingVacationDays = recount('VACATION');
    const existingPersonalDays = recount('PERSONAL');

    // Run the rules engine
    const result = validateAbsenceRequest({
        type: data.type,
        startDate: start,
        endDate: end,
        hours: data.hours,
        isLateNotice: data.isLateNotice,
        isHrOverride,
        counters: {
            vacationDays: user.vacationDays ?? 23,
            personalDays: user.personalDays ?? 2,
            looseVacationDaysUsed: user.looseVacationDaysUsed ?? 0,
            looseVacationDaysWithoutNotice: user.looseVacationDaysWithoutNotice ?? 0,
            childSicknessHoursBank: user.childSicknessHoursBank ?? 32,
            hireDate: user.hireDate,
        },
        holidays,
        existingVacationDays,
        existingPersonalDays,
    });

    if (!result.valid) {
        throw new Error(result.errors.join(' | '));
    }

    // Deduct child sickness hours immediately (before creating absence)
    if (data.type === 'CHILD_SICKNESS') {
        const hoursToDeduct = data.hours ?? result.workingDays * 8;
        await prisma.user.update({
            where: { id: user.id },
            data: { childSicknessHoursBank: { decrement: hoursToDeduct } }
        });
    }

    // Create absence record
    const absence = await prisma.absence.create({
        data: {
            userId: user.id,
            type: data.type,
            startDate: start,
            endDate: result.finalEndDate,
            totalDays: result.totalDays,
            reason: data.reason,
            hours: data.type === 'CHILD_SICKNESS' ? (data.hours ?? null) : null,
            startTime: data.startTime ?? null,
            endTime: data.endTime ?? null,
            isLooseDayWithoutNotice: result.isLooseDayWithoutNotice,
            attachmentUrl: data.attachmentUrl ?? null,
            status: 'PENDING',
        }
    });

    // Update loose day counters
    if (result.isLooseDay) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                looseVacationDaysUsed: { increment: result.workingDays },
                ...(result.isLooseDayWithoutNotice && {
                    looseVacationDaysWithoutNotice: { increment: result.workingDays }
                }),
            }
        });
    }

    // Notify managers / admins
    const typeLabels: Record<string, string> = {
        VACATION: 'vacaciones', SICK: 'baja por enfermedad',
        PERSONAL: 'asuntos propios', MATERNITY: 'baja por maternidad',
        PATERNITY: 'baja por paternidad', MARRIAGE: 'permiso por matrimonio',
        BEREAVEMENT_1ST_DEGREE: 'permiso por fallecimiento (1er grado)',
        BEREAVEMENT_2ND_DEGREE: 'permiso por fallecimiento (2º grado)',
        PUBLIC_DUTY: 'deber inexcusable de carácter público',
        CHILD_SICKNESS: 'cuidado de hijos menores',
        UNPAID_MONTH: 'permiso sin sueldo', UNPAID: 'permiso no retribuido', OTHER: 'ausencia',
    };
    const typeLabel = typeLabels[data.type] ?? 'ausencia';

    const notifyUsers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN', 'MANAGER'] }, companyId: user.companyId ?? undefined, id: { not: user.id } },
        select: { id: true }
    });

    if (notifyUsers.length > 0) {
        await prisma.notification.createMany({
            data: notifyUsers.map(u => ({
                userId: u.id,
                type: 'SYSTEM' as const,
                title: 'Nueva solicitud de ausencia',
                message: `${user.name} ha solicitado ${typeLabel} (${result.workingDays} días laborables).`,
                link: '/hr/absences',
                senderId: user.id,
            }))
        });
    }

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');

    // Return warnings alongside absence so UI can display them
    return { ...absence, warnings: result.warnings };
}

/**
 * Approve or reject an absence request
 */
export async function processAbsenceRequest(
    absenceId: string,
    action: 'APPROVED' | 'REJECTED',
    note?: string
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN/MANAGER can approve
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para aprobar ausencias');
    }

    const absence = await prisma.absence.update({
        where: { id: absenceId },
        data: {
            status: action,
            approvedById: currentUser.id,
            approvedAt: new Date(),
            rejectionNote: action === 'REJECTED' ? note : null
        },
        include: {
            user: { select: { id: true, name: true } }
        }
    });

    // When approving, cancel any other PENDING absences from the same user that overlap
    if (action === 'APPROVED') {
        await prisma.absence.updateMany({
            where: {
                userId: absence.userId,
                status: 'PENDING',
                id: { not: absenceId },
                startDate: { lte: absence.endDate },
                endDate: { gte: absence.startDate },
            },
            data: { status: 'CANCELLED' },
        });
    }

    // Notify the employee about the status change
    await prisma.notification.create({
        data: {
            userId: absence.userId,
            type: 'SYSTEM',
            title: action === 'APPROVED'
                ? 'Ausencia aprobada'
                : 'Ausencia rechazada',
            message: action === 'APPROVED'
                ? `Tu solicitud de ausencia ha sido aprobada por ${currentUser.name}.`
                : `Tu solicitud de ausencia ha sido rechazada por ${currentUser.name}.${note ? ` Motivo: ${note}` : ''}`,
            link: '/my-absences',
            senderId: currentUser.id
        }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return absence;
}

/**
 * Cancel own absence request (only if pending)
 */
export async function cancelMyAbsence(absenceId: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Check if this absence belongs to the current user
    const absence = await prisma.absence.findUnique({
        where: { id: absenceId }
    });
    if (!absence) throw new Error('Ausencia no encontrada');

    if (absence.userId !== currentUser.id) {
        throw new Error('Solo puedes cancelar tus propias solicitudes');
    }

    if (absence.status !== 'PENDING') {
        throw new Error('Solo puedes cancelar solicitudes pendientes');
    }

    const updated = await prisma.absence.update({
        where: { id: absenceId },
        data: { status: 'CANCELLED' }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return updated;
}

/**
 * Get absences for current user
 */
export async function getMyAbsences() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!user) throw new Error('Usuario no encontrado');

    const absences = await prisma.absence.findMany({
        where: { userId: user.id },
        orderBy: { startDate: 'desc' },
        include: {
            approvedBy: {
                select: { name: true }
            }
        }
    });

    return absences;
}

/**
 * Get employees list for filter dropdowns (lightweight)
 */
export async function getEmployeesForFilter() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos');
    }

    return prisma.user.findMany({
        where: { isActive: true, companyId: currentUser.companyId ?? undefined },
        select: { id: true, name: true, department: true, image: true },
        orderBy: { name: 'asc' }
    });
}

/**
 * Get all absences (for managers)
 */
export async function getAllAbsences(filters?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    type?: string;
    startDate?: Date;
    endDate?: Date;
    userIds?: string[];
    department?: string;
    search?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN/MANAGER can view all absences
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver todas las ausencias');
    }

    const absences = await prisma.absence.findMany({
        where: {
            // Always scope to current user's company
            user: {
                companyId: currentUser.companyId ?? undefined,
                ...(filters?.department && { department: filters.department as any }),
                ...(filters?.search && { name: { contains: filters.search, mode: 'insensitive' as const } }),
            },
            ...(filters?.status && { status: filters.status }),
            ...(filters?.type && { type: filters.type as any }),
            ...(filters?.startDate && { startDate: { gte: filters.startDate } }),
            ...(filters?.endDate && { endDate: { lte: filters.endDate } }),
            ...(filters?.userIds && filters.userIds.length > 0 && { userId: { in: filters.userIds } }),
        },
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: { id: true, name: true, email: true, image: true, department: true }
            },
            approvedBy: {
                select: { name: true }
            }
        }
    });

    return absences;
}

/**
 * Get vacation balance for a user
 */
export async function getVacationBalance(userId?: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    let targetUserId = userId;

    if (!targetUserId) {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });
        if (!user) throw new Error('Usuario no encontrado');
        targetUserId = user.id;
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
            vacationDays: true,
            personalDays: true,
            looseVacationDaysUsed: true,
            looseVacationDaysWithoutNotice: true,
            childSicknessHoursBank: true,
            vacationModifications: true,
            companyId: true,
        }
    });

    if (!user) throw new Error('Usuario no encontrado');

    const personalDays = user.personalDays ?? 2;

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01`);
    const yearEnd = new Date(`${currentYear}-12-31`);

    // Fetch all relevant absences for the year (to recompute working days precisely)
    const yearAbsences = await prisma.absence.findMany({
        where: {
            userId: targetUserId,
            status: { in: ['APPROVED', 'PENDING'] },
            startDate: { gte: yearStart, lte: yearEnd },
        },
        select: { type: true, status: true, startDate: true, endDate: true },
    });

    // Fetch holidays for the year to recount working days accurately
    const yearHolidays = await getCachedHolidaysForYear(currentYear, user.companyId ?? null);

    // Helper: count working days from a stored absence range
    const workingDaysOf = (a: { startDate: Date; endDate: Date }) =>
        countWorkingDays(new Date(a.startDate), new Date(a.endDate), yearHolidays);

    const usedVacation   = yearAbsences.filter(a => a.type === 'VACATION'  && a.status === 'APPROVED').reduce((s, a) => s + workingDaysOf(a), 0);
    const pendingVacation = yearAbsences.filter(a => a.type === 'VACATION' && a.status === 'PENDING').reduce((s, a) => s + workingDaysOf(a), 0);
    const usedPersonal   = yearAbsences.filter(a => a.type === 'PERSONAL'  && a.status === 'APPROVED').reduce((s, a) => s + workingDaysOf(a), 0);
    const pendingPersonal = yearAbsences.filter(a => a.type === 'PERSONAL' && a.status === 'PENDING').reduce((s, a) => s + workingDaysOf(a), 0);

    return {
        vacation: {
            total: user.vacationDays,
            used: usedVacation,
            pending: pendingVacation,
            available: user.vacationDays - usedVacation - pendingVacation,
        },
        personal: {
            total: personalDays,
            used: usedPersonal,
            pending: pendingPersonal,
            available: personalDays - usedPersonal - pendingPersonal,
        },
        // Extended balance fields
        looseVacationDaysUsed: user.looseVacationDaysUsed ?? 0,
        looseVacationDaysWithoutNotice: user.looseVacationDaysWithoutNotice ?? 0,
        childSicknessHoursBank: user.childSicknessHoursBank ?? 32,
        vacationModifications: user.vacationModifications ?? 0,
    };
}

/**
 * Lightweight count of pending absences for sidebar badge (HR roles only).
 * Returns 0 for non-HR users or unauthenticated sessions.
 */
export async function getPendingAbsencesCount(): Promise<number> {
    try {
        const session = await auth();
        if (!session?.user?.email) return 0;

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true, companyId: true },
        });
        if (!currentUser || !['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) return 0;

        return await prisma.absence.count({
            where: {
                status: 'PENDING',
                user: { companyId: currentUser.companyId ?? undefined },
            },
        });
    } catch {
        return 0;
    }
}

/**
 * Get absence statistics for HR dashboard KPI cards
 */
export async function getAbsenceStats() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser || !['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos');
    }

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(todayStr + 'T00:00:00.000Z');
    const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

    const [pending, approvedThisMonth, rejectedThisMonth, absentToday] = await Promise.all([
        prisma.absence.count({ where: { status: 'PENDING' } }),
        prisma.absence.count({
            where: {
                status: 'APPROVED',
                updatedAt: { gte: startOfMonth, lte: endOfMonth }
            }
        }),
        prisma.absence.count({
            where: {
                status: 'REJECTED',
                updatedAt: { gte: startOfMonth, lte: endOfMonth }
            }
        }),
        prisma.absence.findMany({
            where: {
                status: 'APPROVED',
                startDate: { lte: todayEnd },
                endDate: { gte: todayStart }
            },
            include: {
                user: { select: { id: true, name: true, image: true, department: true } }
            }
        })
    ]);

    return { pending, approvedThisMonth, rejectedThisMonth, absentToday };
}

/**
 * Get absences calendar data
 */
export async function getAbsencesCalendar(month: number, year: number, filters?: {
    status?: string;
    userIds?: string[];
    department?: string;
    search?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    // Use UTC dates to match @db.Date storage (UTC midnight)
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0));

    // Build status filter: default shows APPROVED + PENDING
    const statusFilter = filters?.status
        ? { status: filters.status as any }
        : { status: { in: ['APPROVED', 'PENDING'] as any[] } };

    const absences = await prisma.absence.findMany({
        where: {
            ...statusFilter,
            ...(filters?.userIds && filters.userIds.length > 0 && { userId: { in: filters.userIds } }),
            ...(filters?.department && {
                user: { department: filters.department as any }
            }),
            ...(filters?.search && {
                user: { name: { contains: filters.search, mode: 'insensitive' as const } }
            }),
            OR: [
                {
                    startDate: { gte: startOfMonth, lte: endOfMonth }
                },
                {
                    endDate: { gte: startOfMonth, lte: endOfMonth }
                },
                {
                    AND: [
                        { startDate: { lte: startOfMonth } },
                        { endDate: { gte: endOfMonth } }
                    ]
                }
            ]
        },
        include: {
            user: {
                select: { id: true, name: true, image: true, department: true }
            }
        }
    });

    return absences;
}

/**
 * Get all absences for a full year (for HR yearly calendar)
 */
export async function getYearlyAbsences(year: number, filters?: {
    status?: string;
    userIds?: string[];
    department?: string;
    search?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    // Build status filter: default shows APPROVED + PENDING
    const statusFilter = filters?.status
        ? { status: filters.status as any }
        : { status: { in: ['APPROVED', 'PENDING'] as any[] } };

    const absences = await prisma.absence.findMany({
        where: {
            ...statusFilter,
            ...(filters?.userIds && filters.userIds.length > 0 && { userId: { in: filters.userIds } }),
            ...(filters?.department && {
                user: { department: filters.department as any }
            }),
            ...(filters?.search && {
                user: { name: { contains: filters.search, mode: 'insensitive' as const } }
            }),
            OR: [
                {
                    startDate: { gte: startOfYear, lte: endOfYear }
                },
                {
                    endDate: { gte: startOfYear, lte: endOfYear }
                },
                {
                    AND: [
                        { startDate: { lte: startOfYear } },
                        { endDate: { gte: endOfYear } }
                    ]
                }
            ]
        },
        include: {
            user: {
                select: { id: true, name: true, image: true, department: true }
            }
        }
    });

    return absences;
}

// ============================================
// HR DASHBOARD STATS
// ============================================

/**
 * Get HR dashboard statistics
 */
export async function getHRDashboardStats() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN/MANAGER can view HR dashboard
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver el dashboard de RRHH');
    }

    const [
        totalEmployees,
        activeEmployees,
        pendingAbsences,
        absencesToday,
        contractsExpiringSoon
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.absence.count({ where: { status: 'PENDING' } }),
        prisma.absence.count({
            where: {
                status: 'APPROVED',
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            }
        }),
        prisma.user.count({
            where: {
                contractType: 'TEMPORAL',
                contractEndDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            }
        })
    ]);

    return {
        totalEmployees,
        activeEmployees,
        pendingAbsences,
        absencesToday,
        contractsExpiringSoon
    };
}

// ============================================
// PAYROLL MANAGEMENT
// ============================================

/**
 * Get all payroll records with optional filters
 */
export async function getPayrollRecords(filters?: {
    period?: string;
    status?: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'PAID';
    userId?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN can view payroll
    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver nóminas');
    }

    const records = await prisma.payrollRecord.findMany({
        where: {
            ...(filters?.period && { period: filters.period }),
            ...(filters?.status && { status: filters.status }),
            ...(filters?.userId && { userId: filters.userId })
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    department: true,
                    employeeCode: true
                }
            }
        },
        orderBy: [
            { period: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    return records.map(serializePayrollRecord);
}

/**
 * Get single payroll record by ID
 */
export async function getPayrollById(id: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver nóminas');
    }

    const record = await prisma.payrollRecord.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    department: true,
                    employeeCode: true,
                    salary: true,
                    bankAccount: true
                }
            }
        }
    });

    if (!record) throw new Error('Nómina no encontrada');
    return serializePayrollRecord(record);
}

/**
 * Create a payroll record for an employee
 */
export async function createPayrollRecord(data: {
    userId: string;
    period: string; // YYYY-MM
    baseSalary: number;
    overtime?: number;
    bonuses?: number;
    deductions?: number;
    notes?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para crear nóminas');
    }

    // Check if payroll already exists for this user/period
    const existing = await prisma.payrollRecord.findUnique({
        where: {
            userId_period: {
                userId: data.userId,
                period: data.period
            }
        }
    });

    if (existing) {
        throw new Error(`Ya existe una nómina para este empleado en el período ${data.period}`);
    }

    const netSalary = data.baseSalary + (data.overtime || 0) + (data.bonuses || 0) - (data.deductions || 0);

    const record = await prisma.payrollRecord.create({
        data: {
            userId: data.userId,
            period: data.period,
            baseSalary: data.baseSalary,
            overtime: data.overtime || 0,
            bonuses: data.bonuses || 0,
            deductions: data.deductions || 0,
            netSalary,
            notes: data.notes,
            status: 'DRAFT'
        },
        include: {
            user: {
                select: { name: true, email: true }
            }
        }
    });

    revalidatePath('/hr/payroll');
    return record;
}

/**
 * Update payroll record status
 */
export async function updatePayrollStatus(
    id: string,
    status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'PAID',
    paidAt?: Date
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para actualizar nóminas');
    }

    const record = await prisma.payrollRecord.update({
        where: { id },
        data: {
            status,
            ...(status === 'PAID' && { paidAt: paidAt || new Date() })
        }
    });

    revalidatePath('/hr/payroll');
    return record;
}

/**
 * Update payroll record amounts (overtime, bonuses, deductions)
 */
export async function updatePayrollAmounts(
    id: string,
    data: {
        overtime?: number;
        bonuses?: number;
        deductions?: number;
        notes?: string;
    }
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para editar nóminas');
    }

    // Get current record to recalculate net salary
    const current = await prisma.payrollRecord.findUnique({
        where: { id }
    });
    if (!current) throw new Error('Nómina no encontrada');

    // Only allow editing if not PAID
    if (current.status === 'PAID') {
        throw new Error('No se puede editar una nómina ya pagada');
    }

    const overtime = data.overtime ?? Number(current.overtime);
    const bonuses = data.bonuses ?? Number(current.bonuses);
    const deductions = data.deductions ?? Number(current.deductions);
    const baseSalary = Number(current.baseSalary);
    const netSalary = baseSalary + overtime + bonuses - deductions;

    const record = await prisma.payrollRecord.update({
        where: { id },
        data: {
            overtime,
            bonuses,
            deductions,
            netSalary,
            notes: data.notes ?? current.notes
        }
    });

    revalidatePath('/hr/payroll');
    revalidatePath(`/hr/payroll/${id}`);
    return serializePayrollRecord(record);
}

/**
 * Generate monthly payroll records for all active employees
 */
export async function generateMonthlyPayroll(period: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para generar nóminas');
    }

    // Get all active employees with salary
    const employees = await prisma.user.findMany({
        where: {
            isActive: true,
            salary: { not: null }
        },
        select: {
            id: true,
            name: true,
            salary: true
        }
    });

    const created: string[] = [];
    const skipped: string[] = [];

    for (const emp of employees) {
        // Check if already exists
        const existing = await prisma.payrollRecord.findUnique({
            where: {
                userId_period: {
                    userId: emp.id,
                    period
                }
            }
        });

        if (existing) {
            skipped.push(emp.name || emp.id);
            continue;
        }

        const baseSalary = Number(emp.salary);
        await prisma.payrollRecord.create({
            data: {
                userId: emp.id,
                period,
                baseSalary,
                overtime: 0,
                bonuses: 0,
                deductions: 0,
                netSalary: baseSalary,
                status: 'DRAFT'
            }
        });
        created.push(emp.name || emp.id);
    }

    revalidatePath('/hr/payroll');
    return { created, skipped };
}

/**
 * Get payroll summary for a period
 */
export async function getPayrollSummary(period: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver resumen de nóminas');
    }

    const records = await prisma.payrollRecord.findMany({
        where: { period }
    });

    const totals = records.reduce((acc, r) => ({
        count: acc.count + 1,
        baseSalary: acc.baseSalary + Number(r.baseSalary),
        overtime: acc.overtime + Number(r.overtime),
        bonuses: acc.bonuses + Number(r.bonuses),
        deductions: acc.deductions + Number(r.deductions),
        netSalary: acc.netSalary + Number(r.netSalary)
    }), { count: 0, baseSalary: 0, overtime: 0, bonuses: 0, deductions: 0, netSalary: 0 });

    const byStatus = {
        DRAFT: records.filter(r => r.status === 'DRAFT').length,
        PROCESSING: records.filter(r => r.status === 'PROCESSING').length,
        COMPLETED: records.filter(r => r.status === 'COMPLETED').length,
        PAID: records.filter(r => r.status === 'PAID').length
    };

    return { totals, byStatus };
}

// ============================================
// NOTIFICATIONS & ALERTS
// ============================================

/**
 * Get employees with expiring contracts (within X days)
 */
export async function getExpiringContracts(days: number = 30) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos');
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const employees = await prisma.user.findMany({
        where: {
            isActive: true,
            contractEndDate: {
                gte: new Date(),
                lte: futureDate
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            employeeCode: true,
            contractType: true,
            contractEndDate: true
        },
        orderBy: { contractEndDate: 'asc' }
    });

    return employees;
}

/**
 * Get available payroll periods (last 12 months + next month)
 */
export async function getPayrollPeriods() {
    const periods: { value: string; label: string }[] = [];
    const now = new Date();

    // Add next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    periods.push({
        value: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`,
        label: nextMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    });

    // Add current and last 11 months
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periods.push({
            value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        });
    }

    return periods;
}

/**
 * Update an existing absence (Admin only)
 */
export async function updateAbsence(
    absenceId: string,
    data: {
        type?: 'VACATION' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
        startDate?: Date;
        endDate?: Date;
        reason?: string;
        status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    }
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    // Only ADMIN/MANAGER can update
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para editar ausencias');
    }

    // Prepare update data
    const updateData: any = { ...data };

    // Recalculate totalDays if dates change
    if (data.startDate || data.endDate) {
        // We need existing dates if only one is provided
        const currentAbsence = await prisma.absence.findUnique({ where: { id: absenceId } });
        if (!currentAbsence) throw new Error('Ausencia no encontrada');

        const start = data.startDate ? new Date(data.startDate) : currentAbsence.startDate;
        const end = data.endDate ? new Date(data.endDate) : currentAbsence.endDate;

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updateData.totalDays = totalDays;
    }

    const absence = await prisma.absence.update({
        where: { id: absenceId },
        data: updateData,
        include: {
            user: { select: { id: true, name: true } }
        }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    return absence;
}

/**
 * Get holidays for a given year (for calendar display)
 */
export async function getHolidaysForCalendar(year: number) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { companyId: true }
    });
    if (!user) throw new Error('Usuario no encontrado');

    const holidays = await prisma.holiday.findMany({
        where: {
            year,
            OR: [
                { companyId: null },
                { companyId: user.companyId ?? undefined }
            ]
        },
        select: { date: true, name: true, type: true },
        orderBy: { date: 'asc' }
    });

    return holidays.map(h => ({
        date: h.date.toISOString().split('T')[0],
        name: h.name,
        type: h.type
    }));
}

/**
 * Delete an absence (admin only, works on any status including APPROVED)
 */
export async function deleteAbsence(absenceId: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('Solo administradores pueden eliminar ausencias');
    }

    const absence = await prisma.absence.findUnique({
        where: { id: absenceId },
        include: { user: { select: { name: true } } }
    });
    if (!absence) throw new Error('Ausencia no encontrada');

    await prisma.absence.delete({ where: { id: absenceId } });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/hr/absences/calendar');
    revalidatePath('/my-absences');

    return { success: true, userName: absence.user?.name };
}

/**
 * Archive an absence (set status to CANCELLED) without hard-deleting it.
 * Used when HR removes it from APPROVED/REJECTED feeds — still visible in ALL tab.
 */
export async function archiveAbsence(absenceId: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para archivar ausencias');
    }

    await prisma.absence.update({
        where: { id: absenceId },
        data: { status: 'CANCELLED' }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/hr/absences/calendar');
    revalidatePath('/my-absences');

    return { success: true };
}

/**
 * Delete multiple absences at once (admin only)
 */
export async function deleteAbsences(absenceIds: string[]) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('Solo administradores pueden eliminar ausencias');
    }

    if (!absenceIds.length) throw new Error('No se han seleccionado ausencias');

    const result = await prisma.absence.deleteMany({
        where: { id: { in: absenceIds } }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/hr/absences/calendar');
    revalidatePath('/my-absences');

    return { success: true, count: result.count };
}

/**
 * Remove a specific calendar day from a (possibly multi-day) absence.
 * - Single-day absence → delete entirely.
 * - Day is the start → advance startDate by 1 calendar day.
 * - Day is the end → retreat endDate by 1 calendar day.
 * - Day is in the middle → split into two absences.
 */
export async function hrRemoveDayFromAbsence(absenceId: string, dateStr: string) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) throw new Error('Usuario no encontrado');
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para modificar ausencias');
    }

    const absence = await prisma.absence.findUnique({ where: { id: absenceId } });
    if (!absence) throw new Error('Ausencia no encontrada');

    const absStart = absence.startDate.toISOString().split('T')[0];
    const absEnd = absence.endDate.toISOString().split('T')[0];

    const holidays = await fetchHolidaysForRange(absence.startDate, absence.endDate, currentUser.companyId);

    if (absStart === absEnd) {
        // Single-day → archive (CANCELLED) so it stays as history in ALL tab
        await prisma.absence.update({ where: { id: absenceId }, data: { status: 'CANCELLED' } });
    } else if (dateStr <= absStart) {
        // Remove from start
        const newStart = new Date(absence.startDate);
        newStart.setDate(newStart.getDate() + 1);
        const newTotal = countWorkingDays(newStart, absence.endDate, holidays);
        await prisma.absence.update({ where: { id: absenceId }, data: { startDate: newStart, totalDays: newTotal } });
    } else if (dateStr >= absEnd) {
        // Remove from end
        const newEnd = new Date(absence.endDate);
        newEnd.setDate(newEnd.getDate() - 1);
        const newTotal = countWorkingDays(absence.startDate, newEnd, holidays);
        await prisma.absence.update({ where: { id: absenceId }, data: { endDate: newEnd, totalDays: newTotal } });
    } else {
        // Middle → split into two
        const removedDate = new Date(dateStr + 'T12:00:00');
        const part1End = new Date(removedDate);
        part1End.setDate(part1End.getDate() - 1);
        const part2Start = new Date(removedDate);
        part2Start.setDate(part2Start.getDate() + 1);

        const part1Days = countWorkingDays(absence.startDate, part1End, holidays);
        const part2Days = countWorkingDays(part2Start, absence.endDate, holidays);

        await prisma.absence.update({
            where: { id: absenceId },
            data: { endDate: part1End, totalDays: part1Days }
        });
        await prisma.absence.create({
            data: {
                userId: absence.userId,
                type: absence.type,
                startDate: part2Start,
                endDate: absence.endDate,
                totalDays: part2Days,
                reason: absence.reason,
                status: absence.status,
                startTime: absence.startTime,
                endTime: absence.endTime,
                attachmentUrl: absence.attachmentUrl,
            }
        });
    }

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/hr/absences/calendar');
    revalidatePath('/my-absences');
    return { success: true };
}

// ============================================
// VACATION MODIFICATION REQUESTS
// ============================================

/**
 * Employee requests a modification to an already-approved absence.
 * Unlimited submissions per user; HR reviews each.
 */
export async function requestVacationModification(data: {
    absenceId?: string;
    type: 'CHANGE_DATES' | 'CANCEL_APPROVED' | 'ADD_DAYS' | 'REDUCE_DAYS';
    description: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error('Usuario no encontrado');

    // If modifying a specific absence, verify ownership
    if (data.absenceId) {
        const absence = await prisma.absence.findUnique({ where: { id: data.absenceId } });
        if (!absence) throw new Error('Ausencia no encontrada');
        if (absence.userId !== user.id && !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
            throw new Error('No puedes modificar ausencias de otro empleado');
        }
    }

    const mod = await (prisma as any).vacationModification.create({
        data: {
            userId: user.id,
            absenceId: data.absenceId ?? null,
            requestedBy: user.id,
            type: data.type,
            description: data.description,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            totalDays: data.totalDays,
            status: 'PENDING',
        }
    });

    // Increment the user's modification counter
    await prisma.user.update({
        where: { id: user.id },
        data: { vacationModifications: { increment: 1 } }
    });

    // Notify HR/ADMIN
    const hrUsers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, companyId: user.companyId ?? undefined, id: { not: user.id } },
        select: { id: true }
    });
    if (hrUsers.length > 0) {
        await prisma.notification.createMany({
            data: hrUsers.map(u => ({
                userId: u.id,
                type: 'SYSTEM' as const,
                title: 'Solicitud de modificación de ausencia',
                message: `${user.name} ha solicitado una modificación de ausencia.`,
                link: '/hr/absences',
                senderId: user.id,
            }))
        });
    }

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return mod;
}

/**
 * HR approves or rejects a vacation modification request.
 */
export async function processVacationModification(
    modId: string,
    action: 'APPROVED' | 'REJECTED',
    note?: string
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para procesar modificaciones');
    }

    const mod = await (prisma as any).vacationModification.update({
        where: { id: modId },
        data: {
            status: action,
            reviewedById: currentUser.id,
            reviewedAt: new Date(),
            reviewNote: note ?? null,
        },
        include: { user: { select: { id: true, name: true } } }
    });

    // If this is a date-swap approval, cascade the effects
    if (action === 'APPROVED' && mod.type === 'CHANGE_DATES' && mod.absenceId) {
        const swapMatch = (mod.description as string).match(/^SWAP:(\[.*?\])/);
        if (swapMatch) {
            let swapIds: string[] = [];
            try { swapIds = JSON.parse(swapMatch[1]); } catch { /* ignore */ }
            if (swapIds.length > 0) {
                // Cancel the old absences
                await prisma.absence.updateMany({
                    where: { id: { in: swapIds }, userId: mod.userId },
                    data: { status: 'CANCELLED' }
                });
            }
            // Approve the new absence
            await prisma.absence.update({
                where: { id: mod.absenceId },
                data: { status: 'APPROVED', approvedById: currentUser.id, approvedAt: new Date() }
            });
        }
    }

    // Notify employee
    await prisma.notification.create({
        data: {
            userId: mod.userId,
            type: 'SYSTEM',
            title: action === 'APPROVED' ? 'Modificación aprobada' : 'Modificación rechazada',
            message: action === 'APPROVED'
                ? `Tu solicitud de modificación ha sido aprobada por ${currentUser.name}.`
                : `Tu solicitud de modificación ha sido rechazada por ${currentUser.name}.${note ? ` Motivo: ${note}` : ''}`,
            link: '/my-absences',
            senderId: currentUser.id,
        }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return mod;
}

/**
 * Get all pending vacation modification requests (for HR dashboard).
 */
export async function getVacationModifications(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
        throw new Error('No tienes permisos para ver modificaciones');
    }

    return (prisma as any).vacationModification.findMany({
        where: {
            ...(status && { status }),
            user: { companyId: currentUser.companyId ?? undefined }
        },
        include: {
            user: { select: { id: true, name: true, image: true, department: true } },
            reviewer: { select: { name: true } },
            absence: { select: { id: true, type: true, startDate: true, endDate: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * HR manual override: directly update an absence without going through
 * the normal request flow.
 */
export async function hrOverrideAbsence(
    absenceId: string,
    updates: {
        startDate?: Date;
        endDate?: Date;
        totalDays?: number;
        type?: string;
        status?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CANCELLED';
        reason?: string;
    }
) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('Solo administradores pueden modificar ausencias directamente');
    }

    const absence = await prisma.absence.findUnique({ where: { id: absenceId } });
    if (!absence) throw new Error('Ausencia no encontrada');

    const newStart = updates.startDate ? new Date(updates.startDate) : absence.startDate;
    const newEnd   = updates.endDate   ? new Date(updates.endDate)   : absence.endDate;

    // Cancel other PENDING/APPROVED records for the same user that overlap the new dates
    await prisma.absence.updateMany({
        where: {
            userId: absence.userId,
            status: { in: ['PENDING', 'APPROVED'] },
            id: { not: absenceId },
            startDate: { lte: newEnd },
            endDate: { gte: newStart },
        },
        data: { status: 'CANCELLED' },
    });

    const updated = await prisma.absence.update({
        where: { id: absenceId },
        data: {
            ...(updates.startDate && { startDate: newStart }),
            ...(updates.endDate && { endDate: newEnd }),
            ...(updates.totalDays !== undefined && { totalDays: updates.totalDays }),
            ...(updates.type && { type: updates.type as any }),
            ...(updates.status && { status: updates.status }),
            ...(updates.reason !== undefined && { reason: updates.reason }),
            approvedById: currentUser.id,
            approvedAt: new Date(),
        }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return updated;
}

/**
 * Get the calling user's future APPROVED or PENDING absences.
 * Used to display options for a date-swap request.
 */
export async function getMyFutureAbsences() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error('Usuario no encontrado');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.absence.findMany({
        where: {
            userId: user.id,
            status: { in: ['APPROVED', 'PENDING'] },
            startDate: { gte: today },
        },
        orderBy: { startDate: 'asc' },
    });
}

/**
 * User requests a date swap: new vacation/personal days in exchange for
 * cancelling existing future absences. Creates the new absence (PENDING)
 * and a VacationModification (CHANGE_DATES) that HR must approve.
 * On approval, the swapped-out absences are cancelled automatically.
 *
 * Description format: "SWAP:[\"id1\",\"id2\"]\n<user description>"
 */
export async function requestAbsenceSwap(data: {
    type: 'VACATION' | 'PERSONAL';
    newStartDate: Date;
    newEndDate: Date;
    reason?: string;
    attachmentUrl?: string;
    swapAbsenceIds: string[];
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, companyId: true, role: true }
    });
    if (!user) throw new Error('Usuario no encontrado');

    if (data.swapAbsenceIds.length === 0) {
        throw new Error('Debes seleccionar al menos una ausencia para intercambiar');
    }

    // Verify the swapped absences belong to this user and are still future
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const swapAbsences = await prisma.absence.findMany({
        where: {
            id: { in: data.swapAbsenceIds },
            userId: user.id,
            status: { in: ['APPROVED', 'PENDING'] },
            startDate: { gte: today },
        }
    });
    if (swapAbsences.length !== data.swapAbsenceIds.length) {
        throw new Error('Algunas ausencias seleccionadas no son válidas para el intercambio');
    }

    const start = new Date(data.newStartDate);
    const end = new Date(data.newEndDate);
    const holidays = await fetchHolidaysForRange(start, end, user.companyId);
    const workingDays = countWorkingDays(start, end, holidays);

    // Create the new absence (PENDING, balance override — HR decides)
    const newAbsence = await prisma.absence.create({
        data: {
            userId: user.id,
            type: data.type,
            startDate: start,
            endDate: end,
            totalDays: workingDays,
            reason: data.reason ?? null,
            attachmentUrl: data.attachmentUrl ?? null,
            status: 'PENDING',
        }
    });

    // Create the modification request linking swap IDs in the description
    const swapMeta = `SWAP:${JSON.stringify(data.swapAbsenceIds)}`;
    const description = data.reason
        ? `${swapMeta}\n${data.reason}`
        : `${swapMeta}\nSolicitud de cambio de fechas de vacaciones`;

    await (prisma as any).vacationModification.create({
        data: {
            userId: user.id,
            absenceId: newAbsence.id,
            requestedBy: user.id,
            type: 'CHANGE_DATES',
            description,
            startDate: start,
            endDate: end,
            totalDays: workingDays,
            status: 'PENDING',
        }
    });

    await prisma.user.update({
        where: { id: user.id },
        data: { vacationModifications: { increment: 1 } }
    });

    // Notify HR
    const hrUsers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, companyId: user.companyId ?? undefined, id: { not: user.id } },
        select: { id: true }
    });
    if (hrUsers.length > 0) {
        await prisma.notification.createMany({
            data: hrUsers.map(u => ({
                userId: u.id,
                type: 'SYSTEM' as const,
                title: 'Solicitud de cambio de fechas',
                message: `${user.name} solicita cambiar ${swapAbsences.length} día(s) de vacaciones por nuevas fechas.`,
                link: '/hr/absences',
                senderId: user.id,
            }))
        });
    }

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return newAbsence;
}

/**
 * HR creates an absence for any employee directly (bypasses rules engine).
 */
export async function hrCreateAbsence(data: {
    userId: string;
    type: string;
    startDate: Date;
    endDate: Date;
    totalDays?: number;
    hours?: number;
    startTime?: string;
    endTime?: string;
    reason?: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    attachmentUrl?: string;
}) {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autorizado');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) throw new Error('Usuario no encontrado');

    if (!['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
        throw new Error('Solo administradores pueden crear ausencias directamente');
    }

    // Verify the target user belongs to the same company
    const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, name: true, companyId: true }
    });
    if (!targetUser) throw new Error('Empleado no encontrado');
    if (targetUser.companyId !== currentUser.companyId) {
        throw new Error('No puedes gestionar empleados de otra empresa');
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const holidays = await fetchHolidaysForRange(start, end, currentUser.companyId);
    const workingDays = countWorkingDays(start, end, holidays);

    // Cancel any existing PENDING/APPROVED absences for this user that overlap the new dates
    await prisma.absence.updateMany({
        where: {
            userId: data.userId,
            status: { in: ['PENDING', 'APPROVED'] },
            startDate: { lte: end },
            endDate: { gte: start },
        },
        data: { status: 'CANCELLED' },
    });

    const absence = await prisma.absence.create({
        data: {
            userId: data.userId,
            type: data.type as any,
            startDate: start,
            endDate: end,
            totalDays: data.totalDays ?? workingDays,
            hours: data.hours ?? null,
            startTime: data.startTime ?? null,
            endTime: data.endTime ?? null,
            reason: data.reason ?? null,
            attachmentUrl: data.attachmentUrl ?? null,
            status: data.status,
            approvedById: data.status === 'APPROVED' ? currentUser.id : null,
            approvedAt: data.status === 'APPROVED' ? new Date() : null,
        }
    });

    // Notify the employee
    await prisma.notification.create({
        data: {
            userId: data.userId,
            type: 'SYSTEM',
            title: 'Ausencia registrada por RRHH',
            message: `RRHH ha registrado una ausencia en tu nombre (${start.toLocaleDateString('es-ES')} – ${end.toLocaleDateString('es-ES')}).`,
            link: '/my-absences',
            senderId: currentUser.id,
        }
    });

    revalidatePath('/hr');
    revalidatePath('/hr/absences');
    revalidatePath('/my-absences');
    return absence;
}
