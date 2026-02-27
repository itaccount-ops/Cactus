'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check, Building2, Users, Filter } from 'lucide-react';

export interface AbsenceFilterValues {
    search: string;
    status: string;
    department: string;
    userIds: string[];
}

interface UserOption {
    id: string;
    name: string | null;
    department: string | null;
    image: string | null;
}

interface AbsenceFiltersProps {
    filters: AbsenceFilterValues;
    onChange: (filters: AbsenceFilterValues) => void;
    users?: UserOption[];
    showStatusFilter?: boolean;
}

const DEPARTMENTS: Record<string, string> = {
    CIVIL_DESIGN: 'Diseño Civil',
    ELECTRICAL: 'Eléctrica',
    INSTRUMENTATION: 'Instrumentación',
    ADMINISTRATION: 'Administración',
    IT: 'IT',
    ECONOMIC: 'Económico',
    MARKETING: 'Marketing',
    OTHER: 'Otro',
};

const STATUSES: Record<string, string> = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
    CANCELLED: 'Cancelada',
};

function MultiSelectDropdown({
    label,
    icon,
    options,
    selected,
    onChange,
    renderOption,
}: {
    label: string;
    icon: React.ReactNode;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    renderOption?: (option: { value: string; label: string }) => React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${selected.length > 0
                        ? 'border-olive-500 bg-olive-50 dark:bg-olive-900/20 text-olive-700 dark:text-olive-400'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
            >
                {icon}
                <span>{label}</span>
                {selected.length > 0 && (
                    <span className="bg-olive-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {selected.length}
                    </span>
                )}
                <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                    {selected.length > 0 && (
                        <button
                            onClick={() => onChange([])}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            Limpiar selección
                        </button>
                    )}
                    {options.map(option => (
                        <button
                            key={option.value}
                            onClick={() => toggle(option.value)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300"
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(option.value)
                                    ? 'bg-olive-600 border-olive-600 text-white'
                                    : 'border-neutral-300 dark:border-neutral-600'
                                }`}>
                                {selected.includes(option.value) && <Check className="w-3 h-3" />}
                            </div>
                            {renderOption ? renderOption(option) : <span>{option.label}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AbsenceFilters({ filters, onChange, users = [], showStatusFilter = true }: AbsenceFiltersProps) {
    const update = (partial: Partial<AbsenceFilterValues>) => {
        onChange({ ...filters, ...partial });
    };

    const hasActiveFilters = filters.search || filters.status || filters.department || filters.userIds.length > 0;

    const clearAll = () => {
        onChange({ search: '', status: '', department: '', userIds: [] });
    };

    const userOptions = users.map(u => ({
        value: u.id,
        label: u.name || 'Sin nombre',
    }));

    const departmentOptions = Object.entries(DEPARTMENTS).map(([value, label]) => ({
        value,
        label,
    }));

    const statusOptions = Object.entries(STATUSES).map(([value, label]) => ({
        value,
        label,
    }));

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => update({ search: e.target.value })}
                        placeholder="Buscar por nombre..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    />
                    {filters.search && (
                        <button
                            onClick={() => update({ search: '' })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Status filter */}
                {showStatusFilter && (
                    <select
                        value={filters.status}
                        onChange={(e) => update({ status: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm"
                    >
                        <option value="">Todos los estados</option>
                        {statusOptions.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                )}

                {/* Department multi-select */}
                <MultiSelectDropdown
                    label="Departamento"
                    icon={<Building2 className="w-4 h-4" />}
                    options={departmentOptions}
                    selected={filters.department ? [filters.department] : []}
                    onChange={(vals) => update({ department: vals[vals.length - 1] || '' })}
                />

                {/* Users multi-select */}
                {users.length > 0 && (
                    <MultiSelectDropdown
                        label="Empleados"
                        icon={<Users className="w-4 h-4" />}
                        options={userOptions}
                        selected={filters.userIds}
                        onChange={(userIds) => update({ userIds })}
                    />
                )}

                {/* Clear all */}
                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Limpiar filtros
                    </button>
                )}
            </div>
        </div>
    );
}
