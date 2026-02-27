'use server';

/**
 * Control de Horas - Server Actions
 * 
 * Capa de agregación sobre el módulo Registro Horario existente.
 * Solo lectura de TimeEntry - NO modifica datos.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/permissions";
import {
    getDiasDelMes,
    getDiasLaborablesMes,
    getDiasLaborablesHastaFecha,
    calcularHorasPrevistas,
    calcularDiferencia,
    calcularPorcentaje,
    calcularCompensacionHoras,
    getEstadoDia,
    DEPARTMENT_COLORS,
    DEPARTMENT_LABELS,
    MESES,
    ABSENCE_TYPE_LABELS,
    type DiaConHoras,
    type ResumenMensual,
    type ResumenUsuarioEquipo,
    type ResumenProyecto,
    type ResumenAnualUsuario,
    type MatrizCelda,
    type MatrizProyecto,
    type MatrizPersonaInfo,
    type ResultadoMatriz,
} from './utils';

// ============================================
// HELPERS
// ============================================

async function getAuthUser() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("No autenticado");
    }
    return session.user as {
        id: string;
        role: string;
        companyId?: string;
        department?: string;
        dailyWorkHours?: number;
    };
}

function canViewOtherUser(viewer: { role: string, id: string, department?: string }, targetUser: { id: string, department?: string | null }): boolean {
    if (targetUser.id === viewer.id) return true;
    if (['ADMIN', 'SUPERADMIN'].includes(viewer.role)) return true;
    if (viewer.role === 'MANAGER') {
        return viewer.department === targetUser.department;
    }
    return false;
}

function canAccessEquipo(role: string): boolean {
    return ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(role);
}

// Fetch holidays from database for a specific year
async function getHolidaysForYear(year: number, companyId?: string): Promise<{ date: Date; name: string }[]> {
    const holidays = await prisma.holiday.findMany({
        where: {
            year,
            OR: [
                { companyId: null }, // Global holidays
                { companyId: companyId ?? undefined } // Company-specific
            ]
        },
        select: { date: true, name: true }
    });
    return holidays.map(h => ({ date: new Date(h.date), name: h.name }));
}

// Fetch approved absences for a user in a date range
async function getAbsencesForRange(userId: string, startDate: Date, endDate: Date) {
    return prisma.absence.findMany({
        where: {
            userId,
            status: 'APPROVED',
            startDate: { lte: endDate },
            endDate: { gte: startDate },
        },
        select: { startDate: true, endDate: true, type: true }
    });
}

// Check if a specific date falls within any absence range
function getAbsenceForDate(date: Date, absences: { startDate: Date; endDate: Date; type: string }[]): string | null {
    for (const absence of absences) {
        const start = new Date(absence.startDate);
        const end = new Date(absence.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const check = new Date(date);
        check.setHours(12, 0, 0, 0);
        if (check >= start && check <= end) {
            return absence.type;
        }
    }
    return null;
}

// Get holiday name for a specific date
function getHolidayNameForDate(date: Date, holidays: { date: Date; name: string }[]): string | null {
    for (const h of holidays) {
        const hd = new Date(h.date);
        if (hd.getFullYear() === date.getFullYear() && hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate()) {
            return h.name;
        }
    }
    return null;
}

// ============================================
// MI HOJA - Vista personal mensual
// ============================================

export async function getMiHoja(
    año: number,
    mes: number,
    targetUserId?: string
): Promise<ResumenMensual> {
    const user = await getAuthUser();
    const userId = targetUserId || user.id;

    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, dailyWorkHours: true, department: true }
    });

    if (!targetUser) {
        throw new Error("Usuario no encontrado");
    }

    // Obtener datos frescos del usuario actual (para asegurar que el departamento es correcto)
    const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, role: true, department: true }
    });

    if (!currentUser) throw new Error("Usuario actual no encontrado");

    // Verificar permisos (Actualizado con Dept check)
    // Usamos currentUser en lugar de user (session) para garantizar consistencia
    if (!canViewOtherUser(currentUser, targetUser)) {
        console.log(`[PermissionDenied] Viewer: ${currentUser.name} (${currentUser.role}, Dept: ${currentUser.department}) -> Target: ${targetUser.id} (Dept: ${targetUser.department})`);
        throw new Error("No tienes permiso para ver esta hoja");
    }

    const jornadaDiaria = targetUser.dailyWorkHours || 8;

    // Obtener festivos de la base de datos
    const festivosDB = await getHolidaysForYear(año, user.companyId || undefined);
    const festivosDates = festivosDB.map(h => h.date);

    // Obtener ausencias aprobadas del usuario para este mes
    const absences = await getAbsencesForRange(userId, new Date(año, mes, 1), new Date(año, mes + 1, 0));

    // Obtener días del mes con info de laborabilidad
    const diasInfo = getDiasDelMes(año, mes, festivosDates);

    // Enriquecer días con info de festivos y ausencias
    diasInfo.forEach(diaInfo => {
        const holidayName = getHolidayNameForDate(diaInfo.fecha, festivosDB);
        if (holidayName) {
            diaInfo.nombreFestivo = holidayName;
        }
        const absenceType = getAbsenceForDate(diaInfo.fecha, absences);
        if (absenceType && diaInfo.esLaborable) {
            diaInfo.esAusencia = true;
            diaInfo.tipoAusencia = absenceType;
        }
    });

    const diasLaborables = diasInfo.filter(d => d.esLaborable).length;
    const diasAusencia = diasInfo.filter(d => d.esAusencia).length;

    // Fecha límite para el mes actual (hasta hoy) o fin de mes
    const hoy = new Date();
    const esActual = hoy.getFullYear() === año && hoy.getMonth() === mes;
    const fechaLimite = esActual ? hoy : new Date(año, mes + 1, 0);

    // Obtener TimeEntries del mes
    const primerDia2 = new Date(año, mes, 1);
    const ultimoDia2 = new Date(año, mes + 1, 0, 23, 59, 59);

    const entries = await prisma.timeEntry.findMany({
        where: {
            userId,
            date: { gte: primerDia2, lte: ultimoDia2 }
        },
        include: {
            project: {
                select: { id: true, code: true, name: true }
            }
        },
        orderBy: { date: 'asc' }
    });

    // Agrupar entries por día
    const entriesPorDia: Record<number, typeof entries> = {};
    entries.forEach(entry => {
        const dia = new Date(entry.date).getDate();
        if (!entriesPorDia[dia]) entriesPorDia[dia] = [];
        entriesPorDia[dia].push(entry);
    });

    // Construir días con horas
    const diasDelMes: DiaConHoras[] = diasInfo.map(diaInfo => {
        const entriesDelDia = entriesPorDia[diaInfo.dia] || [];

        // Agrupar por proyecto
        const horasPorProyecto: Record<string, { projectId: string; projectCode: string; projectName: string; hours: number }> = {};
        const notas: string[] = [];

        entriesDelDia.forEach(entry => {
            const pId = entry.projectId;
            if (!horasPorProyecto[pId]) {
                horasPorProyecto[pId] = {
                    projectId: pId,
                    projectCode: entry.project.code,
                    projectName: entry.project.name,
                    hours: 0
                };
            }
            horasPorProyecto[pId].hours += entry.hours;
            if (entry.notes) notas.push(entry.notes);
        });

        const totalHoras = entriesDelDia.reduce((sum, e) => sum + e.hours, 0);
        const estado = getEstadoDia(totalHoras, diaInfo.esLaborable, jornadaDiaria, diaInfo.esAusencia || false);

        return {
            ...diaInfo,
            horasPorProyecto: Object.values(horasPorProyecto),
            totalHoras,
            notas,
            estado
        };
    });

    // Calcular totales por proyecto
    const totalesPorProyecto: Record<string, { projectId: string; projectCode: string; projectName: string; hours: number }> = {};
    entries.forEach(entry => {
        const pId = entry.projectId;
        if (!totalesPorProyecto[pId]) {
            totalesPorProyecto[pId] = {
                projectId: pId,
                projectCode: entry.project.code,
                projectName: entry.project.name,
                hours: 0
            };
        }
        totalesPorProyecto[pId].hours += entry.hours;
    });

    // Calcular métricas
    const horasReales = entries.reduce((sum, e) => sum + e.hours, 0);

    // Días laborables hasta fecha límite (restando ausencias)
    const diasLaborablesHastaLimite = esActual
        ? getDiasLaborablesHastaFecha(año, mes, hoy, festivosDates)
        : diasLaborables;

    // Restar días de ausencia del cómputo de horas previstas
    const diasAusenciaHastaLimite = diasInfo.filter(d =>
        d.esAusencia && d.fecha <= fechaLimite
    ).length;
    const diasEfectivos = Math.max(0, diasLaborablesHastaLimite - diasAusenciaHastaLimite);

    const horasPrevistas = calcularHorasPrevistas(diasEfectivos, jornadaDiaria);
    const diferencia = calcularDiferencia(horasReales, horasPrevistas);

    // Contar días con entradas (únicos)
    const diasConEntradas = new Set(entries.map(e => new Date(e.date).getDate())).size;

    // Días sin imputar (excluir ausencias)
    const diasSinImputar = diasDelMes.filter(d =>
        d.esLaborable && !d.esAusencia && d.estado === 'vacio' && d.fecha <= fechaLimite
    ).length;

    const diasIncompletos = diasDelMes.filter(d =>
        d.esLaborable && !d.esAusencia && d.estado === 'incompleto' && d.fecha <= fechaLimite
    ).length;

    const porcentajeCumplimiento = calcularPorcentaje(horasReales, horasPrevistas);

    return {
        año,
        mes,
        mesLabel: MESES[mes],
        diasDelMes,
        horasReales: Math.round(horasReales * 10) / 10,
        horasPrevistas: Math.round(horasPrevistas * 10) / 10,
        diferencia: Math.round(diferencia * 10) / 10,
        diasLaborables,
        diasConEntradas,
        diasSinImputar,
        diasIncompletos,
        porcentajeCumplimiento,
        totalesPorProyecto: Object.values(totalesPorProyecto).sort((a, b) => b.hours - a.hours),
        diasCompensados: calcularCompensacionHoras(diasDelMes),
    };
}

// ============================================
// EQUIPO - Vista global de trabajadores
// ============================================

export async function getEquipoResumen(
    año: number,
    mes: number,
    departamentoFiltro?: string
): Promise<ResumenUsuarioEquipo[]> {
    const user = await getAuthUser();

    if (!canAccessEquipo(user.role)) {
        throw new Error("No tienes permiso para ver el resumen de equipo");
    }

    // Obtener usuarios según rol y filtros
    const whereClause: any = {
        isActive: true,
        canTrackHours: true,
    };

    // Filtro por company
    if (user.companyId) {
        whereClause.companyId = user.companyId;
    }

    // MANAGER solo ve su departamento (a menos que sea ADMIN+)
    if (user.role === 'MANAGER' && user.department) {
        whereClause.department = user.department;
    } else if (departamentoFiltro) {
        whereClause.department = departamentoFiltro;
    }

    // Excluir GUEST
    whereClause.role = { not: 'GUEST' };

    const usuarios = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            dailyWorkHours: true,
        },
        orderBy: { name: 'asc' }
    });

    // Fechas del mes
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0, 23, 59, 59);
    const hoy = new Date();
    const esActual = hoy.getFullYear() === año && hoy.getMonth() === mes;
    const fechaLimite = esActual ? hoy : ultimoDia;

    // Obtener festivos de la base de datos
    const festivosDB = await getHolidaysForYear(año, user.companyId || undefined);
    const festivosDates = festivosDB.map(h => h.date);

    // Calcular días laborables
    const diasLaborables = getDiasLaborablesMes(año, mes, festivosDates);
    const diasLaborablesHastaLimite = esActual
        ? getDiasLaborablesHastaFecha(año, mes, hoy, festivosDates)
        : diasLaborables;

    // Obtener ausencias aprobadas de todos los usuarios del equipo
    const todasAusencias = await prisma.absence.findMany({
        where: {
            userId: { in: usuarios.map(u => u.id) },
            status: 'APPROVED',
            startDate: { lte: ultimoDia },
            endDate: { gte: primerDia },
        },
        select: { userId: true, startDate: true, endDate: true, type: true }
    });

    // Agrupar ausencias por usuario
    const ausenciasPorUsuario: Record<string, typeof todasAusencias> = {};
    todasAusencias.forEach(a => {
        if (!ausenciasPorUsuario[a.userId]) ausenciasPorUsuario[a.userId] = [];
        ausenciasPorUsuario[a.userId].push(a);
    });

    // Obtener todas las entries del mes para todos los usuarios
    const userIds = usuarios.map(u => u.id);
    const todasEntries = await prisma.timeEntry.findMany({
        where: {
            userId: { in: userIds },
            date: { gte: primerDia, lte: ultimoDia }
        },
        select: {
            userId: true,
            date: true,
            hours: true
        }
    });

    // Agrupar por usuario
    const entriesPorUsuario: Record<string, { totalHoras: number; diasUnicos: Set<number>; ultimoDia: Date | null }> = {};

    todasEntries.forEach(entry => {
        if (!entriesPorUsuario[entry.userId]) {
            entriesPorUsuario[entry.userId] = {
                totalHoras: 0,
                diasUnicos: new Set(),
                ultimoDia: null
            };
        }
        entriesPorUsuario[entry.userId].totalHoras += entry.hours;
        entriesPorUsuario[entry.userId].diasUnicos.add(new Date(entry.date).getDate());

        const entryDate = new Date(entry.date);
        if (!entriesPorUsuario[entry.userId].ultimoDia || entryDate > entriesPorUsuario[entry.userId].ultimoDia!) {
            entriesPorUsuario[entry.userId].ultimoDia = entryDate;
        }
    });

    // Construir resumen por usuario
    const resumen: ResumenUsuarioEquipo[] = usuarios.map(usuario => {
        const datos = entriesPorUsuario[usuario.id] || {
            totalHoras: 0,
            diasUnicos: new Set(),
            ultimoDia: null
        };

        const jornadaDiaria = usuario.dailyWorkHours || 8;

        // Contar días de ausencia de este usuario en el mes
        const userAbsences = ausenciasPorUsuario[usuario.id] || [];
        const diasInfo = getDiasDelMes(año, mes, festivosDates);
        let diasAusenciaCount = 0;
        diasInfo.forEach(d => {
            if (d.esLaborable && getAbsenceForDate(d.fecha, userAbsences)) {
                diasAusenciaCount++;
            }
        });

        const diasEfectivos = Math.max(0, diasLaborablesHastaLimite - diasAusenciaCount);
        const horasPrevistas = calcularHorasPrevistas(diasEfectivos, jornadaDiaria);
        const horasReales = datos.totalHoras;
        const diferencia = calcularDiferencia(horasReales, horasPrevistas);
        const porcentajeCumplimiento = calcularPorcentaje(horasReales, horasPrevistas);

        // Días sin imputar = laborables hasta hoy - días con entradas - días de ausencia
        const diasSinImputar = Math.max(0, diasLaborablesHastaLimite - datos.diasUnicos.size - diasAusenciaCount);

        const dept = usuario.department || 'OTHER';

        return {
            userId: usuario.id,
            userName: usuario.name,
            userEmail: usuario.email,
            userImage: usuario.image,
            department: dept,
            departmentLabel: DEPARTMENT_LABELS[dept] || dept,
            departmentColor: DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS.OTHER,
            jornadaDiaria,
            ultimoDiaImputado: datos.ultimoDia,
            diasSinImputar,
            horasPrevistas: Math.round(horasPrevistas * 10) / 10,
            horasReales: Math.round(horasReales * 10) / 10,
            diferencia: Math.round(diferencia * 10) / 10,
            porcentajeCumplimiento
        };
    });

    // Ordenar por días sin imputar (más problemáticos primero)
    return resumen.sort((a, b) => b.diasSinImputar - a.diasSinImputar);
}

// ============================================
// PROYECTOS - Resumen por proyecto
// ============================================

export async function getProyectosResumen(
    año: number,
    proyectosFiltro?: string[],
    departamentoFiltro?: string,
    userIdFiltro?: string
): Promise<{ proyectos: ResumenProyecto[]; totalHoras: number }> {
    const user = await getAuthUser();

    if (!canAccessEquipo(user.role)) {
        throw new Error("No tienes permiso para ver el resumen de proyectos");
    }

    // Fechas del año completo
    const primerDia = new Date(año, 0, 1);
    const ultimoDia = new Date(año, 11, 31, 23, 59, 59);

    // Construir where
    const whereClause: any = {
        date: { gte: primerDia, lte: ultimoDia }
    };

    // Build user filter
    const userFilter: any = {};
    if (user.companyId) {
        userFilter.companyId = user.companyId;
    }

    // MANAGER only sees their department
    if (user.role === 'MANAGER' && user.department) {
        userFilter.department = user.department;
    } else if (departamentoFiltro) {
        userFilter.department = departamentoFiltro;
    }

    // User ID filter
    if (userIdFiltro) {
        userFilter.id = userIdFiltro;
    }

    if (Object.keys(userFilter).length > 0) {
        whereClause.user = userFilter;
    }

    if (proyectosFiltro && proyectosFiltro.length > 0) {
        whereClause.projectId = { in: proyectosFiltro };
    }

    // Obtener entries
    const entries = await prisma.timeEntry.findMany({
        where: whereClause,
        select: {
            projectId: true,
            userId: true,
            date: true,
            hours: true,
            project: {
                select: { id: true, code: true, name: true }
            },
            user: {
                select: { id: true, name: true }
            }
        }
    });

    // Agrupar por proyecto
    const proyectosMap: Record<string, {
        project: { id: string; code: string; name: string };
        horasPorMes: Record<number, number>;
        totalHoras: number;
        horasPorUsuario: Record<string, { userId: string; userName: string; hours: number; horasPorMes: Record<number, number> }>;
    }> = {};

    let totalHorasGlobal = 0;

    entries.forEach(entry => {
        const pId = entry.projectId;
        const mes = new Date(entry.date).getMonth();

        if (!proyectosMap[pId]) {
            proyectosMap[pId] = {
                project: entry.project,
                horasPorMes: {},
                totalHoras: 0,
                horasPorUsuario: {}
            };
        }

        proyectosMap[pId].horasPorMes[mes] = (proyectosMap[pId].horasPorMes[mes] || 0) + entry.hours;
        proyectosMap[pId].totalHoras += entry.hours;
        totalHorasGlobal += entry.hours;

        // Desglose por usuario (con horas mensuales)
        if (!proyectosMap[pId].horasPorUsuario[entry.userId]) {
            proyectosMap[pId].horasPorUsuario[entry.userId] = {
                userId: entry.userId,
                userName: entry.user.name,
                hours: 0,
                horasPorMes: {}
            };
        }
        proyectosMap[pId].horasPorUsuario[entry.userId].hours += entry.hours;
        proyectosMap[pId].horasPorUsuario[entry.userId].horasPorMes[mes] =
            (proyectosMap[pId].horasPorUsuario[entry.userId].horasPorMes[mes] || 0) + entry.hours;
    });

    // Construir resultado
    const proyectos: ResumenProyecto[] = Object.values(proyectosMap)
        .map(p => ({
            projectId: p.project.id,
            projectCode: p.project.code,
            projectName: p.project.name,
            horasPorMes: p.horasPorMes,
            totalHoras: Math.round(p.totalHoras * 10) / 10,
            porcentaje: totalHorasGlobal > 0 ? Math.round((p.totalHoras / totalHorasGlobal) * 100) : 0,
            desglosePorUsuario: Object.values(p.horasPorUsuario)
                .map(u => ({
                    ...u,
                    hours: Math.round(u.hours * 10) / 10,
                    horasPorMes: Object.fromEntries(
                        Object.entries(u.horasPorMes).map(([k, v]) => [k, Math.round((v as number) * 10) / 10])
                    ) as Record<number, number>
                }))
                .sort((a, b) => b.hours - a.hours)
        }))
        .sort((a, b) => b.totalHoras - a.totalHoras);

    return {
        proyectos,
        totalHoras: Math.round(totalHorasGlobal * 10) / 10
    };
}

// ============================================
// ANUAL - Vista anual por persona
// ============================================

export async function getAnualResumen(
    año: number,
    departamentoFiltro?: string
): Promise<{ usuarios: ResumenAnualUsuario[]; totalesPorMes: number[]; totalGlobal: number }> {
    const user = await getAuthUser();

    if (!canAccessEquipo(user.role)) {
        throw new Error("No tienes permiso para ver el resumen anual");
    }

    // Obtener usuarios
    const whereUsuarios: any = {
        isActive: true,
        canTrackHours: true,
        role: { not: 'GUEST' }
    };

    if (user.companyId) {
        whereUsuarios.companyId = user.companyId;
    }

    if (user.role === 'MANAGER' && user.department) {
        whereUsuarios.department = user.department;
    } else if (departamentoFiltro) {
        whereUsuarios.department = departamentoFiltro;
    }

    const usuarios = await prisma.user.findMany({
        where: whereUsuarios,
        select: {
            id: true,
            name: true,
            department: true,
            dailyWorkHours: true
        },
        orderBy: { name: 'asc' }
    });

    // Fechas del año
    const primerDia = new Date(año, 0, 1);
    const ultimoDia = new Date(año, 11, 31, 23, 59, 59);

    // Obtener entries del año
    const userIds = usuarios.map(u => u.id);
    const entries = await prisma.timeEntry.findMany({
        where: {
            userId: { in: userIds },
            date: { gte: primerDia, lte: ultimoDia }
        },
        select: {
            userId: true,
            date: true,
            hours: true
        }
    });

    // Agrupar por usuario y mes
    const horasPorUsuarioMes: Record<string, Record<number, number>> = {};
    entries.forEach(entry => {
        const mes = new Date(entry.date).getMonth();
        if (!horasPorUsuarioMes[entry.userId]) {
            horasPorUsuarioMes[entry.userId] = {};
        }
        horasPorUsuarioMes[entry.userId][mes] = (horasPorUsuarioMes[entry.userId][mes] || 0) + entry.hours;
    });

    // Obtener festivos de la base de datos
    const festivosDB = await getHolidaysForYear(año, user.companyId || undefined);
    const festivosDates = festivosDB.map(h => h.date);

    // Calcular días laborables por mes para horas previstas anuales
    const diasLaborablesPorMes: number[] = [];
    for (let m = 0; m < 12; m++) {
        diasLaborablesPorMes.push(getDiasLaborablesMes(año, m, festivosDates));
    }

    // Construir resultado
    const totalesPorMes: number[] = Array(12).fill(0);
    let totalGlobal = 0;

    const resumenUsuarios: ResumenAnualUsuario[] = usuarios.map(usuario => {
        const horasPorMes: number[] = Array(12).fill(0);
        let totalUsuario = 0;

        const datosUsuario = horasPorUsuarioMes[usuario.id] || {};
        for (let m = 0; m < 12; m++) {
            const horas = datosUsuario[m] || 0;
            horasPorMes[m] = Math.round(horas * 10) / 10;
            totalUsuario += horas;
            totalesPorMes[m] += horas;
        }
        totalGlobal += totalUsuario;

        const jornadaDiaria = usuario.dailyWorkHours || 8;
        const horasPrevistsAnual = diasLaborablesPorMes.reduce((sum, dias) => sum + dias * jornadaDiaria, 0);
        const diferencia = totalUsuario - horasPrevistsAnual;

        const dept = usuario.department || 'OTHER';

        return {
            userId: usuario.id,
            userName: usuario.name,
            department: dept,
            departmentColor: DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS.OTHER,
            horasPorMes,
            totalHoras: Math.round(totalUsuario * 10) / 10,
            horasPrevistas: Math.round(horasPrevistsAnual * 10) / 10,
            diferencia: Math.round(diferencia * 10) / 10
        };
    });

    return {
        usuarios: resumenUsuarios,
        totalesPorMes: totalesPorMes.map(h => Math.round(h * 10) / 10),
        totalGlobal: Math.round(totalGlobal * 10) / 10
    };
}

// ============================================
// UTILIDADES AUXILIARES
// ============================================

export async function getProyectosActivos() {
    const user = await getAuthUser();

    const whereClause: any = { isActive: true };
    if (user.companyId) {
        whereClause.companyId = user.companyId;
    }

    return prisma.project.findMany({
        where: whereClause,
        select: {
            id: true,
            code: true,
            name: true
        },
        orderBy: { code: 'asc' }
    });
}

export async function getDepartamentosConUsuarios() {
    const user = await getAuthUser();

    if (!canAccessEquipo(user.role)) {
        return [];
    }

    const whereClause: any = { isActive: true };
    if (user.companyId) {
        whereClause.companyId = user.companyId;
    }

    const usuarios = await prisma.user.findMany({
        where: whereClause,
        select: { department: true },
        distinct: ['department']
    });

    return usuarios
        .map(u => u.department)
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map(d => ({
            id: d,
            label: DEPARTMENT_LABELS[d] || d,
            color: DEPARTMENT_COLORS[d] || DEPARTMENT_COLORS.OTHER
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

// ============================================
// USERS - Selector de usuarios
// ============================================
export async function getAccessibleUsers() {
    const user = await getAuthUser();

    // WORKER solo se ve a si mismo (o vacio si no debe usar selector)
    if (!['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user.role)) {
        return [];
    }

    const whereClause: any = {
        isActive: true,
        canTrackHours: true,
        // No mostramos GUESTs
        role: { not: 'GUEST' }
    };

    if (user.companyId) {
        whereClause.companyId = user.companyId;
    }

    // MANAGER solo ve su departamento
    if (user.role === 'MANAGER' && user.department) {
        whereClause.department = user.department;
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            role: true
        },
        orderBy: { name: 'asc' }
    });

    return users;
}

// ============================================
// MATRIZ DE HORAS - proyecto × persona
// ============================================

/**
 * Construye la matriz de horas (proyectos × personas) para un mes o para el año completo.
 *
 * - "reales"     = horas imputadas, nunca se modifican.
 * - "calculadas" = compensación secuencial hacia adelante (>8h → sobrante; <8h → recibe);
 *                  nunca supera 8h/día en la vista calculada.
 * - "previstas"  = días laborables efectivos × jornada (solo a nivel persona).
 * - El surplus NO se lleva entre meses (se reinicia en cada mes).
 *
 * @param año   Año a consultar.
 * @param mes   0-11 para vista mensual; null para vista anual (12 meses).
 */
export async function getMatrizHoras(
    año: number,
    mes: number | null,
    departamentoFiltro?: string
): Promise<ResultadoMatriz> {
    const user = await getAuthUser();
    if (!canAccessEquipo(user.role)) {
        throw new Error('No tienes permiso para ver la matriz de horas');
    }

    // ── 1. Usuarios accesibles ─────────────────────────────────────────────
    const whereUsuarios: any = { isActive: true, role: { not: 'GUEST' } };
    if (user.companyId) whereUsuarios.companyId = user.companyId;
    if (user.role === 'MANAGER' && user.department) {
        whereUsuarios.department = user.department;
    } else if (departamentoFiltro) {
        whereUsuarios.department = departamentoFiltro;
    }

    const usuarios = await prisma.user.findMany({
        where: whereUsuarios,
        select: { id: true, name: true, image: true, dailyWorkHours: true },
        orderBy: { name: 'asc' },
    });
    const userIds = usuarios.map(u => u.id);

    // ── 2. Rango de fechas ─────────────────────────────────────────────────
    const primerDia = mes !== null ? new Date(año, mes, 1) : new Date(año, 0, 1);
    const ultimoDia = mes !== null ? new Date(año, mes + 1, 0, 23, 59, 59) : new Date(año, 11, 31, 23, 59, 59);

    // ── 3. Una sola query de TimeEntries ───────────────────────────────────
    const entries = await prisma.timeEntry.findMany({
        where: { userId: { in: userIds }, date: { gte: primerDia, lte: ultimoDia } },
        select: {
            userId: true, projectId: true, date: true, hours: true,
            project: { select: { id: true, code: true, name: true } },
        },
        orderBy: { date: 'asc' },
    });

    // ── 4. Festivos ────────────────────────────────────────────────────────
    const festivosDB = await getHolidaysForYear(año, user.companyId || undefined);
    const festivosDates = festivosDB.map(h => h.date);

    // ── 5. Ausencias aprobadas ─────────────────────────────────────────────
    const todasAusencias = await prisma.absence.findMany({
        where: { userId: { in: userIds }, status: 'APPROVED', startDate: { lte: ultimoDia }, endDate: { gte: primerDia } },
        select: { userId: true, startDate: true, endDate: true, type: true },
    });
    const ausenciasPorUsuario: Record<string, typeof todasAusencias> = {};
    todasAusencias.forEach(a => {
        if (!ausenciasPorUsuario[a.userId]) ausenciasPorUsuario[a.userId] = [];
        ausenciasPorUsuario[a.userId].push(a);
    });

    // ── 6. Indexar entries: userId → mes → dia → { total, proyectos{} } ───
    type DayEntry = { totalHoras: number; proyectos: Record<string, { code: string; name: string; hours: number }> };
    const byUserMesDia: Record<string, Record<number, Record<number, DayEntry>>> = {};
    const proyectosIndex: Record<string, { projectCode: string; projectName: string }> = {};

    entries.forEach(e => {
        const d = new Date(e.date);
        const m = d.getMonth();
        const day = d.getDate();
        proyectosIndex[e.projectId] = { projectCode: e.project.code, projectName: e.project.name };
        const u = byUserMesDia[e.userId] ??= {};
        const mo = u[m] ??= {};
        const dy = mo[day] ??= { totalHoras: 0, proyectos: {} };
        dy.totalHoras += e.hours;
        const pr = dy.proyectos[e.projectId] ??= { code: e.project.code, name: e.project.name, hours: 0 };
        pr.hours += e.hours;
    });

    // ── 7. Calcular compensación y distribuir por proyecto ─────────────────
    // matrizData: projectId → userId → MatrizCelda
    const matrizData: Record<string, Record<string, MatrizCelda>> = {};
    const previstasPerUser: Record<string, number> = {};

    const mesesACalc = mes !== null ? [mes] : Array.from({ length: 12 }, (_, i) => i);

    for (const usuario of usuarios) {
        const jornadaDiaria = usuario.dailyWorkHours || 8;
        const ausencias = ausenciasPorUsuario[usuario.id] || [];
        let totalPrevistas = 0;

        for (const m of mesesACalc) {
            const diasInfo = getDiasDelMes(año, m, festivosDates);
            const byDia = byUserMesDia[usuario.id]?.[m] ?? {};

            // Compensación secuencial (el saldo se reinicia cada mes)
            let saldo = 0;

            // Previstas de este mes
            const diasLaborables = diasInfo.filter(d => d.esLaborable).length;
            const diasAusencia = diasInfo.filter(d => {
                if (!d.esLaborable) return false;
                return !!getAbsenceForDate(d.fecha, ausencias);
            }).length;
            totalPrevistas += Math.max(0, diasLaborables - diasAusencia) * jornadaDiaria;

            for (const diaInfo of diasInfo) {
                if (!diaInfo.esLaborable) continue;
                if (getAbsenceForDate(diaInfo.fecha, ausencias)) continue;

                const dayData = byDia[diaInfo.dia];
                const totalReal = dayData?.totalHoras ?? 0;
                if (totalReal === 0) continue; // sin horas, no participa

                // Determinar horas calculadas para este día (cap 8)
                let totalCalc: number;
                if (totalReal > 8) {
                    saldo = Math.round((saldo + (totalReal - 8)) * 100) / 100;
                    totalCalc = 8;
                } else if (totalReal < 8 && saldo > 0) {
                    const comp = Math.round(Math.min(8 - totalReal, saldo) * 100) / 100;
                    saldo = Math.round((saldo - comp) * 100) / 100;
                    totalCalc = Math.round((totalReal + comp) * 100) / 100;
                } else {
                    totalCalc = totalReal;
                }

                // Distribuir calculadas a proyectos proporcionalmente al peso real del día
                for (const [pId, pData] of Object.entries(dayData!.proyectos)) {
                    const proporcion = pData.hours / totalReal;
                    const calcs = Math.round(proporcion * totalCalc * 100) / 100;

                    if (!matrizData[pId]) matrizData[pId] = {};
                    if (!matrizData[pId][usuario.id]) matrizData[pId][usuario.id] = { reales: 0, calculadas: 0 };
                    matrizData[pId][usuario.id].reales = Math.round((matrizData[pId][usuario.id].reales + pData.hours) * 100) / 100;
                    matrizData[pId][usuario.id].calculadas = Math.round((matrizData[pId][usuario.id].calculadas + calcs) * 100) / 100;
                }
            }
        }

        previstasPerUser[usuario.id] = Math.round(totalPrevistas * 10) / 10;
    }

    // ── 8. Construir MatrizProyecto[] ──────────────────────────────────────
    const proyectos: MatrizProyecto[] = Object.entries(proyectosIndex)
        .sort(([, a], [, b]) => a.projectCode.localeCompare(b.projectCode))
        .map(([pId, pInfo]) => {
            const celdas: Record<string, MatrizCelda> = {};
            let totReales = 0, totCalcs = 0;
            for (const u of usuarios) {
                const c = matrizData[pId]?.[u.id] ?? { reales: 0, calculadas: 0 };
                celdas[u.id] = { reales: Math.round(c.reales * 10) / 10, calculadas: Math.round(c.calculadas * 10) / 10 };
                totReales += c.reales;
                totCalcs += c.calculadas;
            }
            return {
                projectId: pId,
                projectCode: pInfo.projectCode,
                projectName: pInfo.projectName,
                celdas,
                totales: { reales: Math.round(totReales * 10) / 10, calculadas: Math.round(totCalcs * 10) / 10 },
            };
        });

    // ── 9. Totales por persona ─────────────────────────────────────────────
    const personas: MatrizPersonaInfo[] = usuarios.map(u => {
        let reales = 0, calculadas = 0;
        proyectos.forEach(p => {
            reales += p.celdas[u.id]?.reales ?? 0;
            calculadas += p.celdas[u.id]?.calculadas ?? 0;
        });
        return {
            userId: u.id, userName: u.name, userImage: u.image,
            previstas: previstasPerUser[u.id] ?? 0,
            reales: Math.round(reales * 10) / 10,
            calculadas: Math.round(calculadas * 10) / 10,
        };
    });

    const totalesGlobales = {
        reales: Math.round(personas.reduce((s, p) => s + p.reales, 0) * 10) / 10,
        calculadas: Math.round(personas.reduce((s, p) => s + p.calculadas, 0) * 10) / 10,
        previstas: Math.round(personas.reduce((s, p) => s + p.previstas, 0) * 10) / 10,
    };

    return { año, mes, proyectos, personas, totalesGlobales };
}

export async function exportarMiHoja(año: number, mes: number, userId?: string) {
    const user = await getAuthUser();
    const targetUserId = userId || user.id;

    // Log export
    await logActivity(user.id, "EXPORT", "control-horas", targetUserId, `Exportar hoja ${MESES[mes]} ${año}`);

    const data = await getMiHoja(año, mes, userId);
    return data;
}

