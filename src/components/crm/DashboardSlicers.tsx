'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Users, Filter, CalendarDays, BarChart4 } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
}

interface DashboardSlicersProps {
    assignees: SelectOption[];
    sources: SelectOption[];
    years: SelectOption[];
}

export default function DashboardSlicers({ assignees, sources, years }: DashboardSlicersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const currentYear = searchParams.get('year') || new Date().getFullYear().toString();
    const currentMonth = searchParams.get('month') || '';
    const currentAssignee = searchParams.get('assignee') || '';
    const currentSource = searchParams.get('source') || '';

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams]
    );

    const handleFilterChange = (name: string, value: string) => {
        startTransition(() => {
            router.push(`?${createQueryString(name, value)}`, { scroll: false });
        });
    };

    const months = [
        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
        { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
        { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
    ];

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm relative overflow-hidden">
            {isPending && (
                <div className="absolute inset-0 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-olive-600 dark:text-olive-400" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Segmentadores de Datos
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Year Slicer */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Año Fiscal
                    </label>
                    <select
                        value={currentYear}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        className="w-full text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow appearance-none"
                    >
                        {years.map(y => (
                            <option key={y.value} value={y.value}>{y.label}</option>
                        ))}
                    </select>
                </div>

                {/* Month Slicer */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Mes
                    </label>
                    <select
                        value={currentMonth}
                        onChange={(e) => handleFilterChange('month', e.target.value)}
                        className="w-full text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow appearance-none"
                    >
                        <option value="">Todos los meses</option>
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>

                {/* Assignee Slicer */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Comercial Asignado
                    </label>
                    <select
                        value={currentAssignee}
                        onChange={(e) => handleFilterChange('assignee', e.target.value)}
                        className="w-full text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow appearance-none"
                    >
                        <option value="">Todos los comerciales</option>
                        {assignees.map(a => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                    </select>
                </div>

                {/* Source Slicer */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <BarChart4 className="w-3.5 h-3.5" /> Origen del Lead
                    </label>
                    <select
                        value={currentSource}
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                        className="w-full text-sm border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow appearance-none"
                    >
                        <option value="">Todos los orígenes</option>
                        {sources.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            {/* Quick reset visual cue */}
            {(currentMonth || currentAssignee || currentSource) && (
                <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700/50 pt-3 flex justify-end">
                    <button
                        onClick={() => {
                            router.push('?', { scroll: false });
                        }}
                        className="text-xs text-olive-600 dark:text-olive-400 hover:text-olive-800 dark:hover:text-olive-300 font-medium transition-colors"
                    >
                        Limpiar todos los filtros
                    </button>
                </div>
            )}
        </div>
    );
}
