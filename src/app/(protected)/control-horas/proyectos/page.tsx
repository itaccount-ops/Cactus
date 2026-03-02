'use client';

import React, { useState, useEffect } from 'react';
import { FolderOpen, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { getProyectosResumen } from '../actions';
import { formatHoras, MESES_CORTO, type ResumenProyecto } from '../utils';
import TimeControlFilters, { type FilterState } from '@/components/control-horas/TimeControlFilters';

export default function ProyectosPage() {
    const [año, setAño] = useState(new Date().getFullYear());
    const [datos, setDatos] = useState<{ proyectos: ResumenProyecto[]; totalHoras: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [departamentoFiltro, setDepartamentoFiltro] = useState('');
    const [userIdFiltro, setUserIdFiltro] = useState('');
    const [projectFilters, setProjectFilters] = useState<string[]>([]);

    useEffect(() => {
        cargarDatos();
    }, [año, departamentoFiltro, userIdFiltro, projectFilters]);

    const cargarDatos = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getProyectosResumen(año, projectFilters.length > 0 ? projectFilters : undefined, departamentoFiltro || undefined, userIdFiltro || undefined);
            setDatos(result);
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (projectId: string) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedProjects(newExpanded);
    };

    const handleExport = () => {
        if (!datos) return;
        const headers = ['Proyecto', 'Código', ...MESES_CORTO, 'Total', '%'];
        const rows = datos.proyectos.map(p => [
            p.projectName, p.projectCode,
            ...Array(12).fill(0).map((_, m) => p.horasPorMes[m] || 0),
            p.totalHoras, p.porcentaje + '%'
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proyectos-${año}.csv`;
        a.click();
    };

    const handleFilterChange = (filters: FilterState) => {
        setAño(filters.año);
        setDepartamentoFiltro(filters.departmentId);
        setUserIdFiltro(filters.userIds[0] || '');
        setProjectFilters(filters.projectIds);
    };

    // Filtered projects
    const proyectosFiltrados = datos?.proyectos.filter(p => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return p.projectCode.toLowerCase().includes(query) || p.projectName.toLowerCase().includes(query);
    }) ?? [];

    const filterBarActions = (
        <div className="flex items-center gap-2">
            {datos && (
                <span className="text-xs text-neutral-500 font-medium">
                    Total: <span className="font-bold text-olive-600">{formatHoras(datos.totalHoras)}</span>
                </span>
            )}
            <button
                onClick={handleExport}
                disabled={!datos}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                title="Exportar CSV"
            >
                <Download size={15} />
            </button>
        </div>
    );

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">{error}</p>
                <button onClick={cargarDatos} className="mt-4 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                    <FolderOpen className="w-7 h-7 text-olive-600" />
                    Horas por Proyecto
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Distribución anual de horas por proyecto
                </p>
            </div>

            {/* Unified filter bar */}
            <TimeControlFilters
                periods={['year']}
                showUserFilter={true}
                showDepartmentFilter={true}
                showProjectFilter={true}
                showSearch={true}
                searchPlaceholder="Buscar proyecto..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                defaultPeriod="year"
                onChange={handleFilterChange}
                actions={filterBarActions}
            />

            {/* Projects table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : proyectosFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                        No hay datos de proyectos para este año
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase text-neutral-500 sticky left-0 bg-neutral-50 dark:bg-neutral-800">
                                        Proyecto
                                    </th>
                                    {MESES_CORTO.map((mes, i) => (
                                        <th key={i} className="text-right px-2 py-2.5 text-xs font-bold uppercase text-neutral-500 min-w-[48px]">
                                            {mes}
                                        </th>
                                    ))}
                                    <th className="text-right px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Total</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {proyectosFiltrados.map((proyecto) => {
                                    const isExpanded = expandedProjects.has(proyecto.projectId);
                                    return (
                                        <React.Fragment key={proyecto.projectId}>
                                            <tr
                                                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                                                onClick={() => toggleExpand(proyecto.projectId)}
                                            >
                                                <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-neutral-900">
                                                    <div className="flex items-center gap-2">
                                                        {proyecto.desglosePorUsuario && proyecto.desglosePorUsuario.length > 0 ? (
                                                            isExpanded ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />
                                                        ) : (
                                                            <div className="w-3.5"></div>
                                                        )}
                                                        <span className="font-bold text-olive-600 text-sm">{proyecto.projectCode}</span>
                                                        <span className="text-neutral-500 text-xs">· {proyecto.projectName}</span>
                                                    </div>
                                                </td>
                                                {Array(12).fill(0).map((_, m) => (
                                                    <td key={m} className="px-2 py-2.5 text-right text-xs">
                                                        {proyecto.horasPorMes[m] ? (
                                                            <span className="font-medium">{Math.round(proyecto.horasPorMes[m] * 10) / 10}</span>
                                                        ) : (
                                                            <span className="text-neutral-300 dark:text-neutral-600">-</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2.5 text-right font-bold text-olive-600">
                                                    {formatHoras(proyecto.totalHoras)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-medium text-sm">
                                                    {proyecto.porcentaje}%
                                                </td>
                                            </tr>
                                            {/* User breakdown */}
                                            {isExpanded && proyecto.desglosePorUsuario?.map((usuario) => (
                                                <tr
                                                    key={`${proyecto.projectId}-${usuario.userId}`}
                                                    className="bg-neutral-50 dark:bg-neutral-800/30"
                                                >
                                                    <td className="px-4 py-1.5 pl-12 sticky left-0 bg-neutral-50 dark:bg-neutral-800/30">
                                                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                                            └ {usuario.userName}
                                                        </span>
                                                    </td>
                                                    {Array(12).fill(0).map((_, m) => (
                                                        <td key={m} className="px-2 py-1.5 text-right text-[11px] text-neutral-500">
                                                            {usuario.horasPorMes[m] ? (
                                                                <span>{Math.round(usuario.horasPorMes[m] * 10) / 10}</span>
                                                            ) : (
                                                                <span className="text-neutral-300 dark:text-neutral-700">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-1.5 text-right text-xs font-medium">
                                                        {formatHoras(usuario.hours)}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-right text-xs text-neutral-500">
                                                        {proyecto.totalHoras > 0
                                                            ? Math.round((usuario.hours / proyecto.totalHoras) * 100)
                                                            : 0}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                                {/* Totals row */}
                                {datos && (
                                    <tr className="bg-olive-50 dark:bg-olive-900/20 font-bold border-t-2 border-olive-200 dark:border-olive-800">
                                        <td className="px-4 py-2.5 sticky left-0 bg-olive-50 dark:bg-olive-900/20 text-sm">TOTAL</td>
                                        {Array(12).fill(0).map((_, m) => {
                                            const totalMes = datos.proyectos.reduce((sum, p) => sum + (p.horasPorMes[m] || 0), 0);
                                            return (
                                                <td key={m} className="px-2 py-2.5 text-right text-xs">
                                                    {totalMes > 0 ? Math.round(totalMes * 10) / 10 : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2.5 text-right text-olive-700 dark:text-olive-400">
                                            {formatHoras(datos.totalHoras)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-sm">100%</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="text-xs text-neutral-400">
                💡 Haz clic en un proyecto para ver el desglose por persona
            </p>
        </div>
    );
}
