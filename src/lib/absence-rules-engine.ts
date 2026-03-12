/**
 * Absence Rules Engine
 *
 * Centralised business-rule validation for all absence types.
 * Pure functions — no Prisma calls, no side effects.
 * All Prisma data must be fetched by the caller and passed in.
 *
 * Legal basis: Estatuto de los Trabajadores (Spain), company policy.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type AbsenceTypeKey =
    | 'VACATION'
    | 'SICK'
    | 'PERSONAL'
    | 'MATERNITY'
    | 'PATERNITY'
    | 'MARRIAGE'
    | 'BEREAVEMENT_1ST_DEGREE'
    | 'BEREAVEMENT_2ND_DEGREE'
    | 'PUBLIC_DUTY'
    | 'CHILD_SICKNESS'
    | 'UNPAID_MONTH'
    | 'UNPAID'
    | 'OTHER';

export interface Holiday {
    date: string; // ISO date string "YYYY-MM-DD"
}

export interface UserAbsenceCounters {
    vacationDays: number;             // Total vacation days entitled
    personalDays: number;             // Total personal days entitled
    looseVacationDaysUsed: number;    // Loose vacation days used this year
    looseVacationDaysWithoutNotice: number; // Loose days used without notice
    childSicknessHoursBank: number;   // Remaining child sickness hours
    hireDate?: Date | null;
}

export interface ValidationContext {
    type: AbsenceTypeKey;
    startDate: Date;
    endDate: Date;
    hours?: number;          // For CHILD_SICKNESS partial requests
    isLateNotice?: boolean;  // Caller flags short-notice loose day
    isHrOverride?: boolean;  // HR/ADMIN overriding rules
    counters: UserAbsenceCounters;
    holidays: Holiday[];
    /** Existing approved/pending absences for the year (for balance checks) */
    existingVacationDays: number;
    existingPersonalDays: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    /** Computed working days for the request */
    workingDays: number;
    /** Final end date (may differ from input for MARRIAGE auto-extension) */
    finalEndDate: Date;
    /** Total days to store (may be fractional for CHILD_SICKNESS hours) */
    totalDays: number;
    /** Whether this qualifies as a loose day */
    isLooseDay: boolean;
    /** Whether this is a late-notice loose day */
    isLooseDayWithoutNotice: boolean;
}

// ─── Working Day Calculation ─────────────────────────────────────────────────

const SPECIAL_NON_WORKING_DATES = ['12-24', '12-31']; // MM-DD

/**
 * Returns true if the given date is a working day:
 *   - Not Saturday/Sunday
 *   - Not a company holiday
 *   - Not Dec 24 or Dec 31
 */
export function isWorkingDay(date: Date, holidays: Holiday[]): boolean {
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) return false;

    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (SPECIAL_NON_WORKING_DATES.includes(mmdd)) return false;

    const iso = toIsoDateString(date);
    if (holidays.some(h => h.date.startsWith(iso))) return false;

    return true;
}

/**
 * Count working days between startDate and endDate (inclusive).
 */
export function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
    let count = 0;
    const cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setUTCHours(0, 0, 0, 0);

    while (cur <= endNorm) {
        if (isWorkingDay(cur, holidays)) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

/**
 * Count working days that fall in the same ISO week as `date` but outside
 * the [rangeStart, rangeEnd] window. Used for the loose-day "2 working days
 * in the same week" rule.
 */
export function workingDaysInWeekOutsideRange(
    refDate: Date,
    rangeStart: Date,
    rangeEnd: Date,
    holidays: Holiday[]
): number {
    // Find Monday of refDate's week
    const monday = new Date(refDate);
    const dow = monday.getDay();
    monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setUTCHours(0, 0, 0, 0);

    let count = 0;
    const cur = new Date(monday);
    const rsNorm = new Date(rangeStart); rsNorm.setUTCHours(0, 0, 0, 0);
    const reNorm = new Date(rangeEnd); reNorm.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        if (isWorkingDay(cur, holidays) && (cur < rsNorm || cur > reNorm)) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

function toIsoDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Rule Limits ─────────────────────────────────────────────────────────────

export const ABSENCE_LIMITS = {
    LOOSE_DAYS_MAX: 10,              // Max loose vacation days per year
    LOOSE_WITHOUT_NOTICE_MAX: 5,     // Max loose days without advance notice
    LOOSE_DAY_THRESHOLD: 5,          // < 5 working days = loose day period
    CONSECUTIVE_WEEKS_MAX: 2,        // Max consecutive vacation weeks
    CONSECUTIVE_DAYS_MAX: 10,        // = 2 weeks in working days
    NOTICE_DAYS_THRESHOLD: 7,        // Days advance notice required
    MARRIAGE_CALENDAR_DAYS: 15,      // Natural days for marriage leave
    BEREAVEMENT_1ST_MAX: 4,          // Max working days for 1st-degree bereavement
    BEREAVEMENT_2ND_MAX: 5,          // Max working days for 2nd-degree bereavement
    CHILD_SICKNESS_ANNUAL_HOURS: 32, // Hours bank per year
    CHILD_SICKNESS_MIN_HOURS: 0.5,   // Minimum request unit
    CHILD_SICKNESS_MAX_PER_DAY: 8,   // Max hours per day request
    UNPAID_MONTH_MAX_DAYS: 22,       // ~1 calendar month
    UNPAID_MONTH_MIN_SENIORITY_YEARS: 1,
    MIN_WORKING_DAYS_IN_WEEK: 2,     // Must work ≥2 days in the same week as loose day
} as const;

// ─── Main Validator ──────────────────────────────────────────────────────────

/**
 * Validate an absence request against all business rules.
 * Returns a ValidationResult — never throws.
 */
export function validateAbsenceRequest(ctx: ValidationContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { type, startDate, endDate, holidays, counters, isHrOverride = false } = ctx;

    const start = new Date(startDate); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setUTCHours(0, 0, 0, 0);

    if (start > end) {
        errors.push('La fecha de inicio no puede ser posterior a la fecha de fin.');
    }

    const workingDays = countWorkingDays(start, end, holidays);
    let finalEndDate = new Date(end);
    let totalDays = workingDays;
    // A "día suelto" is < 5 working days requested
    const isLooseDay = type === 'VACATION' && workingDays < ABSENCE_LIMITS.LOOSE_DAY_THRESHOLD;
    const isLooseDayWithoutNotice = isLooseDay && (ctx.isLateNotice ?? false);

    // HR override skips most business rules but still validates basic integrity
    if (!isHrOverride) {
        switch (type) {
            case 'VACATION':
                validateVacation({ ctx, start, end, workingDays, isLooseDay, isLooseDayWithoutNotice, errors, warnings, holidays });
                break;
            case 'PERSONAL':
                validatePersonal({ ctx, workingDays, errors });
                break;
            case 'MARRIAGE':
                ({ finalEndDate, totalDays } = validateMarriage({ start, errors }));
                break;
            case 'BEREAVEMENT_1ST_DEGREE':
                validateBereavement1st({ workingDays, errors });
                break;
            case 'BEREAVEMENT_2ND_DEGREE':
                validateBereavement2nd({ workingDays, errors });
                break;
            case 'CHILD_SICKNESS':
                ({ totalDays } = validateChildSickness({ ctx, workingDays, errors, warnings }));
                break;
            case 'UNPAID_MONTH':
                validateUnpaidMonth({ ctx, workingDays, errors });
                break;
        }

        // Vacation expiry (usable until Jan 15 of next year)
        if (type === 'VACATION') {
            const year = start.getFullYear();
            const deadline = new Date(`${year + 1}-01-15`);
            if (end > deadline) {
                errors.push(
                    `Las vacaciones de ${year} solo se pueden disfrutar hasta el 15 de enero de ${year + 1}.`
                );
            }
        }
    } else {
        warnings.push('Reglas de ausencia omitidas por override de RRHH.');
        if (type === 'MARRIAGE') {
            const r = validateMarriage({ start, errors: [] });
            finalEndDate = r.finalEndDate;
            totalDays = r.totalDays;
        }
        if (type === 'CHILD_SICKNESS' && ctx.hours) {
            totalDays = ctx.hours / 8;
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        workingDays,
        finalEndDate,
        totalDays,
        isLooseDay,
        isLooseDayWithoutNotice,
    };
}

// ─── Rule implementations ────────────────────────────────────────────────────

interface VacationArgs {
    ctx: ValidationContext;
    start: Date;
    end: Date;
    workingDays: number;
    isLooseDay: boolean;
    isLooseDayWithoutNotice: boolean;
    errors: string[];
    warnings: string[];
    holidays: Holiday[];
}

function validateVacation({ ctx, start, end, workingDays, isLooseDay, isLooseDayWithoutNotice, errors, warnings, holidays }: VacationArgs) {
    const { counters, existingVacationDays } = ctx;

    // Max 2 consecutive weeks
    if (workingDays > ABSENCE_LIMITS.CONSECUTIVE_DAYS_MAX) {
        errors.push(
            `No se pueden solicitar más de ${ABSENCE_LIMITS.CONSECUTIVE_WEEKS_MAX} semanas consecutivas ` +
            `(máximo ${ABSENCE_LIMITS.CONSECUTIVE_DAYS_MAX} días laborables seguidos).`
        );
    }

    // Vacation balance check
    const totalRequested = existingVacationDays + workingDays;
    if (totalRequested > counters.vacationDays) {
        const available = counters.vacationDays - existingVacationDays;
        errors.push(
            `No tienes suficientes días de vacaciones. Disponibles: ${available}, Solicitados: ${workingDays}.`
        );
    }

    // Loose day limit validation
    if (isLooseDay) {
        if (counters.looseVacationDaysUsed >= ABSENCE_LIMITS.LOOSE_DAYS_MAX) {
            errors.push(
                `Has alcanzado el límite anual de días sueltos (${ABSENCE_LIMITS.LOOSE_DAYS_MAX} días).`
            );
        }
        if (isLooseDayWithoutNotice && counters.looseVacationDaysWithoutNotice >= ABSENCE_LIMITS.LOOSE_WITHOUT_NOTICE_MAX) {
            errors.push(
                `Has alcanzado el límite anual de días de preaviso corto (${ABSENCE_LIMITS.LOOSE_WITHOUT_NOTICE_MAX} días).`
            );
        }
    }

    // Approaching balance warning
    const remaining = counters.vacationDays - existingVacationDays - workingDays;
    if (remaining >= 0 && remaining <= 3) {
        warnings.push(`Solo te quedarán ${remaining} días de vacaciones tras esta solicitud.`);
    }
}

function validatePersonal({ ctx, workingDays, errors }: { ctx: ValidationContext; workingDays: number; errors: string[] }) {
    const available = ctx.counters.personalDays - ctx.existingPersonalDays;
    if (workingDays > available) {
        errors.push(
            `Solo dispones de ${available} días de asuntos propios restantes. Solicitados: ${workingDays}.`
        );
    }
}

function validateMarriage({ start, errors }: { start: Date; errors: string[] }) {
    const finalEndDate = new Date(start);
    finalEndDate.setDate(start.getDate() + ABSENCE_LIMITS.MARRIAGE_CALENDAR_DAYS - 1);
    const totalDays = ABSENCE_LIMITS.MARRIAGE_CALENDAR_DAYS;
    if (errors.length === 0) {
        // No further validation needed — marriage is always 15 calendar days
    }
    return { finalEndDate, totalDays };
}

function validateBereavement1st({ workingDays, errors }: { workingDays: number; errors: string[] }) {
    if (workingDays > ABSENCE_LIMITS.BEREAVEMENT_1ST_MAX) {
        errors.push(
            `El permiso por fallecimiento de cónyuge/progenitor/hijo tiene un máximo de ` +
            `${ABSENCE_LIMITS.BEREAVEMENT_1ST_MAX} días laborables.`
        );
    }
}

function validateBereavement2nd({ workingDays, errors }: { workingDays: number; errors: string[] }) {
    if (workingDays > ABSENCE_LIMITS.BEREAVEMENT_2ND_MAX) {
        errors.push(
            `El permiso por fallecimiento/hospitalización de familiar de 2º grado tiene un máximo de ` +
            `${ABSENCE_LIMITS.BEREAVEMENT_2ND_MAX} días laborables.`
        );
    }
}

function validateChildSickness({
    ctx, workingDays, errors, warnings
}: { ctx: ValidationContext; workingDays: number; errors: string[]; warnings: string[] }) {
    const hoursToDeduct = ctx.hours ?? workingDays * 8;
    const remaining = ctx.counters.childSicknessHoursBank;

    if (ctx.hours !== undefined) {
        if (ctx.hours < ABSENCE_LIMITS.CHILD_SICKNESS_MIN_HOURS) {
            errors.push(`El mínimo de horas por solicitud es ${ABSENCE_LIMITS.CHILD_SICKNESS_MIN_HOURS}h.`);
        }
        if (ctx.hours > ABSENCE_LIMITS.CHILD_SICKNESS_MAX_PER_DAY) {
            errors.push(`No se pueden solicitar más de ${ABSENCE_LIMITS.CHILD_SICKNESS_MAX_PER_DAY}h por día.`);
        }
    }

    if (hoursToDeduct > remaining) {
        errors.push(
            `No tienes suficientes horas en la bolsa de cuidado de hijos. ` +
            `Disponibles: ${remaining}h, Solicitadas: ${hoursToDeduct}h.`
        );
    }

    const afterUse = remaining - hoursToDeduct;
    if (afterUse >= 0 && afterUse <= 8) {
        warnings.push(`Solo te quedarán ${afterUse}h en la bolsa de cuidado de hijos tras esta solicitud.`);
    }

    return { totalDays: ctx.hours ? ctx.hours / 8 : workingDays };
}

function validateUnpaidMonth({
    ctx, workingDays, errors
}: { ctx: ValidationContext; workingDays: number; errors: string[] }) {
    const { hireDate } = ctx.counters;
    if (!hireDate) {
        errors.push('No se encontró la fecha de contratación para validar la antigüedad.');
        return;
    }
    const seniorityYears = (Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (seniorityYears < ABSENCE_LIMITS.UNPAID_MONTH_MIN_SENIORITY_YEARS) {
        errors.push(
            `El permiso sin sueldo requiere una antigüedad mínima de ` +
            `${ABSENCE_LIMITS.UNPAID_MONTH_MIN_SENIORITY_YEARS} año.`
        );
    }
    if (workingDays > ABSENCE_LIMITS.UNPAID_MONTH_MAX_DAYS) {
        errors.push(
            `El permiso sin sueldo tiene una duración máxima de ${ABSENCE_LIMITS.UNPAID_MONTH_MAX_DAYS} días laborables.`
        );
    }
}

// ─── Notice detection helper (used by frontend for real-time UX) ─────────────

/**
 * Returns true when the request would be considered "late notice"
 * (start date is fewer than NOTICE_DAYS_THRESHOLD calendar days from now).
 */
export function isLateNoticeRequest(startDate: Date): boolean {
    const daysUntilStart = Math.ceil(
        (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilStart < ABSENCE_LIMITS.NOTICE_DAYS_THRESHOLD;
}
