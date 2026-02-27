'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Users,
    Filter,
    X,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { getDepartamentosConUsuarios, getAccessibleUsers } from '@/app/(protected)/control-horas/actions';
import { MESES } from '@/app/(protected)/control-horas/utils';

// ─── Types ───────────────────────────────────────────────────────────────

export type PeriodType = 'day' | 'week' | 'month' | 'year';

export interface DateRange {
    start: Date;
    end: Date;
}

export interface FilterState {
    period: PeriodType;
    año: number;
    mes: number;
    dia: number;
    semana: number;
    userIds: string[];
    departmentId: string;
}

export interface TimeControlFiltersProps {
    /** Which period types to show */
    periods?: PeriodType[];
    /** Show user selector */
    showUserFilter?: boolean;
    /** Show department selector */
    showDepartmentFilter?: boolean;
    /** Show inline search field */
    showSearch?: boolean;
    /** Placeholder for search */
    searchPlaceholder?: string;
    /** Controlled search value */
    searchQuery?: string;
    /** Search change handler */
    onSearchChange?: (query: string) => void;
    /** Initial period */
    defaultPeriod?: PeriodType;
    /** Filter change callback */
    onChange: (filters: FilterState, dateRange: DateRange) => void;
    /** Extra controls to render inline (right side) — e.g. export button, view toggles */
    actions?: ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekRange(year: number, week: number): DateRange {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const start = new Date(jan4);
    start.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function getDateRange(filters: FilterState): DateRange {
    switch (filters.period) {
        case 'day':
            return {
                start: new Date(filters.año, filters.mes, filters.dia),
                end: new Date(filters.año, filters.mes, filters.dia, 23, 59, 59, 999),
            };
        case 'week':
            return getWeekRange(filters.año, filters.semana);
        case 'month':
            return {
                start: new Date(filters.año, filters.mes, 1),
                end: new Date(filters.año, filters.mes + 1, 0, 23, 59, 59, 999),
            };
        case 'year':
            return {
                start: new Date(filters.año, 0, 1),
                end: new Date(filters.año, 11, 31, 23, 59, 59, 999),
            };
    }
}

const PERIOD_LABELS: Record<PeriodType, string> = {
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    year: 'Año',
};

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ─── Component ───────────────────────────────────────────────────────────

export default function TimeControlFilters({
    periods = ['day', 'week', 'month', 'year'],
    showUserFilter = false,
    showDepartmentFilter = false,
    showSearch = false,
    searchPlaceholder = 'Buscar...',
    searchQuery = '',
    onSearchChange,
    defaultPeriod = 'month',
    onChange,
    actions,
}: TimeControlFiltersProps) {
    const now = new Date();

    const [filters, setFilters] = useState<FilterState>({
        period: defaultPeriod,
        año: now.getFullYear(),
        mes: now.getMonth(),
        dia: now.getDate(),
        semana: getISOWeek(now),
        userIds: [],
        departmentId: '',
    });

    const [departments, setDepartments] = useState<{ id: string; label: string; color: string }[]>([]);
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const hasAdvancedFilters = showUserFilter || showDepartmentFilter;
    const hasActiveFilters = filters.userIds.length > 0 || filters.departmentId !== '';

    // Load departments and users
    useEffect(() => {
        if (showDepartmentFilter) {
            getDepartamentosConUsuarios().then(setDepartments).catch(console.error);
        }
        if (showUserFilter) {
            getAccessibleUsers().then(setUsers).catch(console.error);
        }
    }, [showUserFilter, showDepartmentFilter]);

    // Notify parent on filter change
    useEffect(() => {
        onChange(filters, getDateRange(filters));
    }, [filters]);

    // ─── Navigation ────────────────────────────────────────

    const navigate = useCallback((delta: number) => {
        setFilters(prev => {
            const next = { ...prev };
            switch (prev.period) {
                case 'day': {
                    const d = new Date(prev.año, prev.mes, prev.dia + delta);
                    next.año = d.getFullYear();
                    next.mes = d.getMonth();
                    next.dia = d.getDate();
                    next.semana = getISOWeek(d);
                    break;
                }
                case 'week': {
                    let w = prev.semana + delta;
                    let y = prev.año;
                    if (w < 1) { y--; w = 52; }
                    if (w > 52) { y++; w = 1; }
                    next.año = y;
                    next.semana = w;
                    break;
                }
                case 'month': {
                    let m = prev.mes + delta;
                    let y = prev.año;
                    if (m < 0) { m = 11; y--; }
                    if (m > 11) { m = 0; y++; }
                    next.año = y;
                    next.mes = m;
                    break;
                }
                case 'year':
                    next.año = prev.año + delta;
                    break;
            }
            return next;
        });
    }, []);

    // ─── Period label ──────────────────────────────────────

    const periodLabel = (() => {
        switch (filters.period) {
            case 'day': {
                const d = new Date(filters.año, filters.mes, filters.dia);
                return `${DIAS_SEMANA_CORTO[d.getDay()]} ${filters.dia} ${MESES[filters.mes]} ${filters.año}`;
            }
            case 'week':
                return `Semana ${filters.semana} — ${filters.año}`;
            case 'month':
                return `${MESES[filters.mes]} ${filters.año}`;
            case 'year':
                return `${filters.año}`;
        }
    })();

    const clearFilters = () => {
        setFilters(prev => ({ ...prev, userIds: [], departmentId: '' }));
        setShowAdvanced(false);
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative z-20">
            {/* ── Main bar ── */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">

                {/* Period tabs */}
                {periods.length > 1 && (
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg mr-1">
                        {periods.map(p => (
                            <button
                                key={p}
                                onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${filters.period === p
                                    ? 'bg-white dark:bg-neutral-700 text-olive-600 dark:text-olive-400 shadow-sm'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
                                    }`}
                            >
                                {PERIOD_LABELS[p]}
                            </button>
                        ))}
                    </div>
                )}

                {/* Date navigator */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={16} className="text-neutral-500" />
                    </button>
                    <span className="min-w-[140px] text-center text-sm font-bold text-neutral-900 dark:text-neutral-100 select-none">
                        {periodLabel}
                    </span>
                    <button
                        onClick={() => navigate(1)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <ChevronRight size={16} className="text-neutral-500" />
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1 hidden sm:block" />

                {/* Inline search */}
                {showSearch && (
                    <div className="relative flex-1 min-w-[140px] max-w-[220px]">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:ring-1 focus:ring-olive-500 focus:border-olive-500 outline-none transition-all placeholder:text-neutral-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange?.('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}

                {/* Spacer pushes right items */}
                <div className="flex-1" />

                {/* Advanced filters toggle */}
                {hasAdvancedFilters && (
                    <button
                        onClick={() => setShowAdvanced(v => !v)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${showAdvanced || hasActiveFilters
                            ? 'bg-olive-50 dark:bg-olive-900/20 text-olive-700 dark:text-olive-400 border-olive-200 dark:border-olive-800'
                            : 'text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:border-olive-300'
                            }`}
                    >
                        <SlidersHorizontal size={13} />
                        Filtros
                        {hasActiveFilters && (
                            <span className="w-4 h-4 flex items-center justify-center bg-olive-600 text-white text-[9px] rounded-full leading-none">
                                {(filters.userIds.length > 0 ? 1 : 0) + (filters.departmentId ? 1 : 0)}
                            </span>
                        )}
                    </button>
                )}

                {/* Extra actions slot (export, view toggle, etc.) */}
                {actions}
            </div>

            {/* ── Advanced filters row (collapsible) ── */}
            {showAdvanced && hasAdvancedFilters && (
                <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                    {showDepartmentFilter && departments.length > 0 && (
                        <div className="min-w-[200px]">
                            <SearchableSelect
                                options={[
                                    { value: '', label: 'Todos los departamentos' },
                                    ...departments.map(d => ({ value: d.id, label: d.label })),
                                ]}
                                value={filters.departmentId}
                                onChange={(val) => setFilters(prev => ({ ...prev, departmentId: val }))}
                                placeholder="Departamento..."
                                searchPlaceholder="Buscar depto..."
                                startIcon={<Filter size={14} />}
                            />
                        </div>
                    )}

                    {showUserFilter && users.length > 0 && (
                        <div className="min-w-[200px]">
                            <SearchableSelect
                                options={users.map(u => ({ value: u.id, label: u.name }))}
                                value={filters.userIds[0] || ''}
                                onChange={(val) => setFilters(prev => ({
                                    ...prev,
                                    userIds: val ? [val] : [],
                                }))}
                                placeholder="Todos los usuarios"
                                searchPlaceholder="Buscar usuario..."
                                startIcon={<Users size={14} />}
                            />
                        </div>
                    )}

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <X size={11} />
                            Limpiar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
