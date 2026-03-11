import { describe, it, expect } from 'vitest';
import {
    validateAbsenceRequest,
    countWorkingDays,
    isWorkingDay,
    isLateNoticeRequest,
    ABSENCE_LIMITS,
    type ValidationContext,
    type Holiday,
} from '../src/lib/absence-rules-engine';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NO_HOLIDAYS: Holiday[] = [];

const HOLIDAYS_2026: Holiday[] = [
    { date: '2026-01-01' }, // Año Nuevo
    { date: '2026-04-02' }, // Jueves Santo
    { date: '2026-04-03' }, // Viernes Santo
    { date: '2026-12-25' }, // Navidad
];

function baseCounters(overrides: Partial<ValidationContext['counters']> = {}): ValidationContext['counters'] {
    return {
        vacationDays: 23,
        personalDays: 2,
        looseVacationDaysUsed: 0,
        looseVacationDaysWithoutNotice: 0,
        childSicknessHoursBank: 32,
        hireDate: new Date('2022-01-01'),
        ...overrides,
    };
}

function ctx(overrides: Partial<ValidationContext>): ValidationContext {
    return {
        type: 'VACATION',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        holidays: NO_HOLIDAYS,
        counters: baseCounters(),
        existingVacationDays: 0,
        existingPersonalDays: 0,
        ...overrides,
    };
}

// ─── Working Day Calculation ─────────────────────────────────────────────────

describe('countWorkingDays', () => {
    it('counts Mon–Fri as 5 working days', () => {
        // 2026-06-01 = Monday
        expect(countWorkingDays(new Date('2026-06-01'), new Date('2026-06-05'), NO_HOLIDAYS)).toBe(5);
    });

    it('skips Saturday and Sunday', () => {
        // 2026-05-30 Sat – 2026-06-01 Mon → only Mon counts
        expect(countWorkingDays(new Date('2026-05-30'), new Date('2026-06-01'), NO_HOLIDAYS)).toBe(1);
    });

    it('skips holidays', () => {
        // 2026-03-30 Mon – 2026-04-05 Sun
        // Mon+Tue+Wed = 3 working, Thu+Fri = holidays, Sat+Sun = weekend → 3 working days
        expect(countWorkingDays(new Date('2026-03-30'), new Date('2026-04-05'), HOLIDAYS_2026)).toBe(3);
    });

    it('skips Dec 24 and Dec 31', () => {
        // 2026-12-24 Thu – 2026-12-24 Thu → 0 (special non-working)
        expect(countWorkingDays(new Date('2026-12-24'), new Date('2026-12-24'), NO_HOLIDAYS)).toBe(0);
        expect(countWorkingDays(new Date('2026-12-31'), new Date('2026-12-31'), NO_HOLIDAYS)).toBe(0);
    });

    it('counts a two-week period correctly', () => {
        // 2026-06-01 Mon – 2026-06-12 Fri = 10 working days
        expect(countWorkingDays(new Date('2026-06-01'), new Date('2026-06-12'), NO_HOLIDAYS)).toBe(10);
    });
});

describe('isWorkingDay', () => {
    it('returns false for Saturday', () => {
        expect(isWorkingDay(new Date('2026-06-06'), NO_HOLIDAYS)).toBe(false);
    });
    it('returns false for Sunday', () => {
        expect(isWorkingDay(new Date('2026-06-07'), NO_HOLIDAYS)).toBe(false);
    });
    it('returns true for Monday', () => {
        expect(isWorkingDay(new Date('2026-06-08'), NO_HOLIDAYS)).toBe(true);
    });
    it('returns false for a holiday', () => {
        expect(isWorkingDay(new Date('2026-04-02'), HOLIDAYS_2026)).toBe(false);
    });
    it('returns false for Dec 24', () => {
        expect(isWorkingDay(new Date('2026-12-24'), NO_HOLIDAYS)).toBe(false);
    });
});

// ─── Vacation Rules ──────────────────────────────────────────────────────────

describe('Vacation — max consecutive weeks', () => {
    it('allows exactly 2 consecutive weeks (10 working days)', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-12'),
        }));
        expect(r.valid).toBe(true);
        expect(r.workingDays).toBe(10);
    });

    it('rejects more than 2 consecutive weeks', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-15'), // 11 working days Mon–Mon
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('consecutivas'))).toBe(true);
    });
});

describe('Vacation — balance', () => {
    it('rejects when requested > available', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
            existingVacationDays: 22, // only 1 day left, requesting 5
        }));
        expect(r.valid).toBe(false);
        // Case-insensitive check (engine uses "Disponibles" with capital D)
        expect(r.errors.some(e => e.toLowerCase().includes('disponibles'))).toBe(true);
    });

    it('warns when balance nearly depleted', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'), // 5 days
            existingVacationDays: 15,        // 23-15-5 = 3 remaining → warning
        }));
        expect(r.valid).toBe(true);
        expect(r.warnings.some(w => w.includes('quedarán'))).toBe(true);
    });
});

describe('Vacation — loose days', () => {
    it('identifies < 5 working days as loose day', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-02'), // 2 working days
        }));
        expect(r.isLooseDay).toBe(true);
    });

    it('rejects when loose day limit exceeded', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-02'),
            counters: baseCounters({ looseVacationDaysUsed: 10 }), // already at max
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('sueltos'))).toBe(true);
    });

    it('rejects late-notice when no-notice limit exceeded', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-01'), // 1 day
            isLateNotice: true,
            counters: baseCounters({ looseVacationDaysWithoutNotice: 5 }), // at max
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('preaviso'))).toBe(true);
    });

    it('marks isLooseDayWithoutNotice correctly', () => {
        const r = validateAbsenceRequest(ctx({
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-01'),
            isLateNotice: true,
        }));
        expect(r.isLooseDayWithoutNotice).toBe(true);
    });
});

// ─── Personal Days ───────────────────────────────────────────────────────────

describe('Personal days', () => {
    it('rejects when personal limit exceeded', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'PERSONAL',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-01'),
            existingPersonalDays: 2, // already used both
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('asuntos propios'))).toBe(true);
    });
});

// ─── Marriage ────────────────────────────────────────────────────────────────

describe('Marriage leave', () => {
    it('auto-extends to 15 calendar days', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'MARRIAGE',
            startDate: new Date('2026-07-01'),
            endDate: new Date('2026-07-01'),
        }));
        expect(r.valid).toBe(true);
        expect(r.totalDays).toBe(15);
        // finalEndDate should be start + 14 days
        const expected = new Date('2026-07-15');
        expect(r.finalEndDate.getFullYear()).toBe(expected.getFullYear());
        expect(r.finalEndDate.getMonth()).toBe(expected.getMonth());
        expect(r.finalEndDate.getDate()).toBe(expected.getDate());
    });
});

// ─── Bereavement ─────────────────────────────────────────────────────────────

describe('Bereavement leave', () => {
    it('allows 4 days for 1st degree', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'BEREAVEMENT_1ST_DEGREE',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-04'),
        }));
        expect(r.valid).toBe(true);
    });

    it('rejects > 4 days for 1st degree', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'BEREAVEMENT_1ST_DEGREE',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'), // 5 working days
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('4'))).toBe(true);
    });

    it('allows 5 days for 2nd degree', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'BEREAVEMENT_2ND_DEGREE',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
        }));
        expect(r.valid).toBe(true);
    });

    it('rejects > 5 days for 2nd degree', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'BEREAVEMENT_2ND_DEGREE',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-08'), // 6 working days
        }));
        expect(r.valid).toBe(false);
    });
});

// ─── Child Sickness ──────────────────────────────────────────────────────────

describe('Child sickness hours bank', () => {
    it('allows request within bank', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'CHILD_SICKNESS',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-01'),
            hours: 4,
            counters: baseCounters({ childSicknessHoursBank: 32 }),
        }));
        expect(r.valid).toBe(true);
        expect(r.totalDays).toBeCloseTo(0.5);
    });

    it('rejects when bank exceeded', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'CHILD_SICKNESS',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-01'),
            hours: 10,
            counters: baseCounters({ childSicknessHoursBank: 4 }),
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('bolsa'))).toBe(true);
    });

    it('warns when bank nearly empty', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'CHILD_SICKNESS',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-01'),
            hours: 4,
            counters: baseCounters({ childSicknessHoursBank: 6 }),
        }));
        expect(r.valid).toBe(true);
        expect(r.warnings.some(w => w.includes('bolsa'))).toBe(true);
    });
});

// ─── HR Override ─────────────────────────────────────────────────────────────

describe('HR Override', () => {
    it('bypasses consecutive week limit when isHrOverride=true', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'VACATION',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-19'), // 15 working days
            isHrOverride: true,
        }));
        expect(r.valid).toBe(true);
        expect(r.warnings.some(w => w.includes('override'))).toBe(true);
    });

    it('bypasses balance check when isHrOverride=true', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'VACATION',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
            existingVacationDays: 23, // all used
            isHrOverride: true,
        }));
        expect(r.valid).toBe(true);
    });
});

// ─── Late Notice Detection ───────────────────────────────────────────────────

describe('isLateNoticeRequest', () => {
    it('returns true when start is within 7 days', () => {
        const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        expect(isLateNoticeRequest(tomorrow)).toBe(true);
    });

    it('returns false when start is 7+ days away', () => {
        const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        expect(isLateNoticeRequest(future)).toBe(false);
    });
});

// ─── Unpaid Month ────────────────────────────────────────────────────────────

describe('Unpaid month leave', () => {
    it('rejects when seniority < 1 year', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'UNPAID_MONTH',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-22'),
            counters: baseCounters({ hireDate: new Date('2026-01-01') }), // only 5 months
        }));
        expect(r.valid).toBe(false);
        expect(r.errors.some(e => e.includes('antigüedad'))).toBe(true);
    });

    it('allows with sufficient seniority', () => {
        const r = validateAbsenceRequest(ctx({
            type: 'UNPAID_MONTH',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-22'),
            counters: baseCounters({ hireDate: new Date('2022-01-01') }),
        }));
        expect(r.valid).toBe(true);
    });
});
