'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    DollarSign,
    Calculator,
    Calendar,
    Filter,
    ChevronDown,
    ChevronUp,
    Search,
    X,
    Users,
    Building2,
    TrendingUp,
    Percent,
    Clock,
    Edit3,
    Check,
    FileSpreadsheet,
    RefreshCw,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
    getCEPData,
    updateUserHourCost,
    getFilterableProjects,
    type CEPProjectData,
    type CEPWorkerData,
    type CEPResponse,
} from './actions';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DEPARTMENT_LABELS: Record<string, string> = {
    CIVIL_DESIGN: 'Diseño y Civil',
    MEP: 'MEP',
    INDUSTRIAL: 'Industrial',
    MANAGEMENT: 'Gestión',
    ADMIN: 'Administración',
    OTHER: 'Otros',
};

export default function CEPPage() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Filters
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [startMonth, setStartMonth] = useState(1);
    const [startYear, setStartYear] = useState(currentYear);
    const [endMonth, setEndMonth] = useState(currentMonth);
    const [endYear, setEndYear] = useState(currentYear);
    const [ggPercentage, setGgPercentage] = useState(40);

    // Data
    const [data, setData] = useState<CEPResponse | null>(null);
    const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    // Edit mode for hour cost
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Load projects for filter
    useEffect(() => {
        const loadProjects = async () => {
            const projs = await getFilterableProjects();
            setProjects(projs);
        };
        loadProjects();
    }, []);

    // Load CEP data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getCEPData(
                selectedProjects,
                startMonth,
                startYear,
                endMonth,
                endYear,
                ggPercentage
            );
            setData(result);
            // Auto-expand all projects on initial load
            if (result.projects.length > 0 && expandedProjects.size === 0) {
                setExpandedProjects(new Set(result.projects.map(p => p.projectId)));
            }
        } catch (error) {
            console.error('Error loading CEP data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedProjects, startMonth, startYear, endMonth, endYear, ggPercentage]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Toggle project expansion
    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    // Handle hour cost edit
    const startEdit = (userId: string, currentCost: number) => {
        setEditingUserId(userId);
        setEditValue(currentCost.toString());
    };

    const saveEdit = async (userId: string) => {
        const newCost = parseFloat(editValue);
        if (isNaN(newCost) || newCost < 0) {
            setEditingUserId(null);
            return;
        }

        const result = await updateUserHourCost(userId, newCost);
        if (result.success) {
            // Reload data to reflect changes
            loadData();
        }
        setEditingUserId(null);
    };

    const cancelEdit = () => {
        setEditingUserId(null);
        setEditValue('');
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
        }).format(value);
    };

    // Format hours
    const formatHours = (hours: number) => {
        return hours.toFixed(1) + 'h';
    };

    // Generate year options
    const yearOptions = useMemo(() => {
        const years = [];
        for (let y = currentYear - 5; y <= currentYear + 1; y++) {
            years.push({ value: y.toString(), label: y.toString() });
        }
        return years;
    }, [currentYear]);

    // Generate month options
    const monthOptions = MONTHS.map((m, i) => ({ value: (i + 1).toString(), label: m }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                        <Calculator className="w-7 h-7 text-olive-600" />
                        Control Económico por Proyecto
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Análisis de costes de personal por proyecto
                    </p>
                </div>

                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-olive-600 text-white rounded-xl font-bold text-sm hover:bg-olive-700 disabled:opacity-50 transition-all"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-bold mb-4">
                    <Filter size={18} />
                    Filtros
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Project Filter */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-2">
                            Proyectos
                        </label>
                        <SearchableSelect
                            options={projects.map(p => ({
                                value: p.id,
                                label: p.code,
                                subLabel: p.name,
                            }))}
                            value={selectedProjects[0] || ''}
                            onChange={(val: string) => setSelectedProjects(val ? [val] : [])}
                            placeholder="Todos los proyectos"
                            searchPlaceholder="Buscar proyecto..."
                            startIcon={<Building2 className="w-4 h-4" />}
                        />
                    </div>

                    {/* GG Percentage */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-2">
                            % Gastos Generales
                        </label>
                        <div className="relative">
                            <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="number"
                                min="0"
                                max="200"
                                value={ggPercentage}
                                onChange={(e) => setGgPercentage(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                            />
                        </div>
                    </div>

                    {/* Placeholder for alignment */}
                    <div></div>

                    {/* Date Range */}
                    <div className="lg:col-span-4">
                        <label className="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-2">
                            Rango de Fechas
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <select
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(Number(e.target.value))}
                                    className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                >
                                    {monthOptions.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={startYear}
                                    onChange={(e) => setStartYear(Number(e.target.value))}
                                    className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                >
                                    {yearOptions.map(y => (
                                        <option key={y.value} value={y.value}>{y.label}</option>
                                    ))}
                                </select>
                            </div>

                            <span className="text-neutral-400 font-bold">→</span>

                            <div className="flex items-center gap-2">
                                <select
                                    value={endMonth}
                                    onChange={(e) => setEndMonth(Number(e.target.value))}
                                    className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                >
                                    {monthOptions.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={endYear}
                                    onChange={(e) => setEndYear(Number(e.target.value))}
                                    className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                >
                                    {yearOptions.map(y => (
                                        <option key={y.value} value={y.value}>{y.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-2">
                            <Clock size={16} className="text-olive-600" />
                            Horas Totales
                        </div>
                        <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                            {formatHours(data.grandTotals.totalHours)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-2">
                            <DollarSign size={16} className="text-blue-600" />
                            Coste Total
                        </div>
                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            {formatCurrency(data.grandTotals.totalCost)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-2">
                            <TrendingUp size={16} className="text-green-600" />
                            Coste Total + GG
                        </div>
                        <div className="text-3xl font-black text-green-600 dark:text-green-400">
                            {formatCurrency(data.grandTotals.totalCostWithGG)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-2">
                            <Percent size={16} className="text-amber-600" />
                            Total GG ({ggPercentage}%)
                        </div>
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                            {formatCurrency(data.grandTotals.totalGG)}
                        </div>
                    </div>
                </div>
            )}

            {/* Projects List */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
                        <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Cargando datos...</span>
                    </div>
                </div>
            ) : data && data.projects.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-12 text-center">
                    <FileSpreadsheet className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                        Sin datos
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        No hay registros de horas para el periodo seleccionado.
                    </p>
                </div>
            ) : data && (
                <div className="space-y-4">
                    {data.projects.map(project => (
                        <div
                            key={project.projectId}
                            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm"
                        >
                            {/* Project Header */}
                            <button
                                onClick={() => toggleProject(project.projectId)}
                                className="w-full flex items-center justify-between p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-olive-100 dark:bg-olive-900/30 rounded-xl text-olive-600 dark:text-olive-400">
                                        <Building2 size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-lg text-neutral-900 dark:text-neutral-100">
                                                {project.projectCode}
                                            </span>
                                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                                ({project.workers.length} trabajadores)
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                            {project.projectName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-neutral-500 uppercase font-bold">Coste Total + GG</p>
                                        <p className="text-lg font-black text-green-600 dark:text-green-400">
                                            {formatCurrency(project.totals.totalCostWithGG)}
                                        </p>
                                    </div>
                                    {expandedProjects.has(project.projectId) ? (
                                        <ChevronUp size={20} className="text-neutral-400" />
                                    ) : (
                                        <ChevronDown size={20} className="text-neutral-400" />
                                    )}
                                </div>
                            </button>

                            {/* Workers Table */}
                            {expandedProjects.has(project.projectId) && (
                                <div className="border-t border-neutral-200 dark:border-neutral-800">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                                <tr className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">
                                                    <th className="text-left px-4 py-3">Trabajador</th>
                                                    <th className="text-center px-4 py-3">Horas</th>
                                                    <th className="text-center px-4 py-3">€/hora</th>
                                                    <th className="text-right px-4 py-3">Coste Total</th>
                                                    <th className="text-center px-4 py-3">€/hora + GG</th>
                                                    <th className="text-right px-4 py-3">Coste + GG</th>
                                                    <th className="text-right px-4 py-3">Total GG</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                {project.workers.map(worker => (
                                                    <tr key={worker.userId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {worker.userImage ? (
                                                                    <img
                                                                        src={worker.userImage}
                                                                        alt={worker.userName}
                                                                        className="w-8 h-8 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-olive-600 font-bold text-sm">
                                                                        {worker.userName.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-bold text-neutral-900 dark:text-neutral-100">
                                                                        {worker.userName}
                                                                    </p>
                                                                    <p className="text-xs text-neutral-500">
                                                                        {DEPARTMENT_LABELS[worker.department] || worker.department}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-neutral-700 dark:text-neutral-300">
                                                            {formatHours(worker.totalHours)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {editingUserId === worker.userId ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="w-20 px-2 py-1 text-sm border border-olive-500 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-olive-500"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveEdit(worker.userId);
                                                                            if (e.key === 'Escape') cancelEdit();
                                                                        }}
                                                                    />
                                                                    <button onClick={() => saveEdit(worker.userId)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => startEdit(worker.userId, worker.hourCost)}
                                                                    className="group flex items-center justify-center gap-1 text-neutral-700 dark:text-neutral-300 hover:text-olive-600"
                                                                >
                                                                    {formatCurrency(worker.hourCost)}
                                                                    <Edit3 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                                            {formatCurrency(worker.totalCost)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-neutral-600 dark:text-neutral-400">
                                                            {formatCurrency(worker.hourCostWithGG)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                                                            {formatCurrency(worker.totalCostWithGG)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                                                            {formatCurrency(worker.totalGG)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold">
                                                <tr>
                                                    <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                                                        Totales Proyecto
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-neutral-900 dark:text-neutral-100">
                                                        {formatHours(project.totals.totalHours)}
                                                    </td>
                                                    <td className="px-4 py-3"></td>
                                                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                                                        {formatCurrency(project.totals.totalCost)}
                                                    </td>
                                                    <td className="px-4 py-3"></td>
                                                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                                                        {formatCurrency(project.totals.totalCostWithGG)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                                                        {formatCurrency(project.totals.totalGG)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
