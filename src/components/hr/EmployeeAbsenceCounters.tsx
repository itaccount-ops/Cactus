'use client';

import { ABSENCE_LIMITS } from '@/lib/absence-rules-engine';

interface Employee {
    id: string;
    name: string;
    image?: string | null;
    vacationDays: number;
    looseVacationDaysUsed?: number;
    looseVacationDaysWithoutNotice?: number;
    childSicknessHoursBank?: number;
    vacationModifications?: number;
    _count?: { absences: number };
}

interface Props {
    employees: Employee[];
}

function Bar({ used, max, danger }: { used: number; max: number; danger?: boolean }) {
    const pct = Math.min(100, Math.round((used / max) * 100));
    const color = danger
        ? 'bg-red-500'
        : pct >= 80 ? 'bg-amber-500' : 'bg-olive-500';
    return (
        <div className="relative w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export function EmployeeAbsenceCounters({ employees }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-100 dark:border-neutral-700">
                        <th className="text-left pb-2 font-medium pl-1">Empleado</th>
                        <th className="text-center pb-2 font-medium px-3">Vacaciones</th>
                        <th className="text-center pb-2 font-medium px-3">Días Sueltos</th>
                        <th className="text-center pb-2 font-medium px-3">Sin Preaviso</th>
                        <th className="text-center pb-2 font-medium px-3">Bolsa Hijos</th>
                        <th className="text-center pb-2 font-medium px-3">Modificaciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                    {employees.map(emp => {
                        const looseUsed = emp.looseVacationDaysUsed ?? 0;
                        const looseNoNotice = emp.looseVacationDaysWithoutNotice ?? 0;
                        const childHrs = emp.childSicknessHoursBank ?? ABSENCE_LIMITS.CHILD_SICKNESS_ANNUAL_HOURS;
                        const mods = emp.vacationModifications ?? 0;

                        return (
                            <tr key={emp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/20 transition-colors">
                                {/* Employee */}
                                <td className="py-2.5 pl-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-xs font-bold text-olive-700 dark:text-olive-400 shrink-0">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-neutral-900 dark:text-white truncate max-w-[130px]">{emp.name}</span>
                                    </div>
                                </td>

                                {/* Vacation days */}
                                <td className="px-3 py-2.5">
                                    <div className="text-center text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {emp.vacationDays} días
                                    </div>
                                </td>

                                {/* Loose days */}
                                <td className="px-3 py-2.5">
                                    <div className="text-center text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {looseUsed}/{ABSENCE_LIMITS.LOOSE_DAYS_MAX}
                                    </div>
                                    <Bar used={looseUsed} max={ABSENCE_LIMITS.LOOSE_DAYS_MAX} danger={looseUsed >= ABSENCE_LIMITS.LOOSE_DAYS_MAX} />
                                </td>

                                {/* No-notice */}
                                <td className="px-3 py-2.5">
                                    <div className="text-center text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {looseNoNotice}/{ABSENCE_LIMITS.LOOSE_WITHOUT_NOTICE_MAX}
                                    </div>
                                    <Bar used={looseNoNotice} max={ABSENCE_LIMITS.LOOSE_WITHOUT_NOTICE_MAX} danger={looseNoNotice >= ABSENCE_LIMITS.LOOSE_WITHOUT_NOTICE_MAX} />
                                </td>

                                {/* Child sickness bank */}
                                <td className="px-3 py-2.5">
                                    <div className="text-center text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {childHrs.toFixed(1)}h/{ABSENCE_LIMITS.CHILD_SICKNESS_ANNUAL_HOURS}h
                                    </div>
                                    <Bar used={ABSENCE_LIMITS.CHILD_SICKNESS_ANNUAL_HOURS - childHrs} max={ABSENCE_LIMITS.CHILD_SICKNESS_ANNUAL_HOURS} danger={childHrs <= 4} />
                                </td>

                                {/* Modification count */}
                                <td className="px-3 py-2.5 text-center">
                                    {mods > 0 ? (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold">
                                            {mods}
                                        </span>
                                    ) : (
                                        <span className="text-neutral-300 dark:text-neutral-600">—</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
