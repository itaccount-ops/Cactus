'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, Eye, Download, List, TrendingUp, TrendingDown, Search, X, HardHat, Shuffle } from 'lucide-react';
import { getMiHoja, getAccessibleUsers, exportarMiHoja } from '../actions';
import DailyHoursView from '@/components/hours/DailyHoursView';
import TimeControlFilters, { type FilterState, type DateRange } from '@/components/control-horas/TimeControlFilters';
import {
    formatHoras,
    formatDiferencia,
    getColorEstadoDia,
    getColorDiasSinImputar,
    getColorDiferencia,
    MESES,
    DIAS_SEMANA,
    ABSENCE_TYPE_LABELS,
    type ResumenMensual
} from '../utils';
import { useSession } from 'next-auth/react';

export default function MiHojaPage() {
    const { data: session } = useSession();
    const [año, setAño] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [datos, setDatos] = useState<ResumenMensual | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [viewMode, setViewMode] = useState<'resumen' | 'detalle'>('resumen');
    const [vistaRedistribuida, setVistaRedistribuida] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize user ID
    useEffect(() => {
        if (session?.user?.id && !selectedUserId) {
            setSelectedUserId(session.user.id);
        }
    }, [session]);

    // Load data
    useEffect(() => {
        if (selectedUserId) cargarDatos();
    }, [año, mes, selectedUserId]);

    const cargarDatos = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getMiHoja(año, mes, selectedUserId);
            setDatos(result);
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (filters: FilterState) => {
        setAño(filters.año);
        setMes(filters.mes);
        if (filters.userIds.length > 0) {
            setSelectedUserId(filters.userIds[0]);
        }
    };

    const handleExport = async () => {
        try {
            const data = await exportarMiHoja(año, mes, selectedUserId);
            const headers = ['Día', 'Día Semana', 'Estado', 'Total Horas', 'Proyectos', 'Notas'];
            const rows = data.diasDelMes.map(d => [
                d.dia,
                d.diaSemanaLabel,
                d.estado,
                d.totalHoras,
                d.horasPorProyecto.map(p => `${p.projectCode}:${p.hours} h`).join('; '),
                d.notas.join('; ')
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mi-hoja-${MESES[mes]}-${año}.csv`;
            a.click();
        } catch (err) {
            console.error('Error exportando:', err);
        }
    };

    if (!session || !selectedUserId) return null;

    // ─── Inline actions for the filter bar ──────────────────

    const filterBarActions = (
        <div className="flex items-center gap-1.5">
            {/* Real / Compensada toggle */}
            <button
                onClick={() => setVistaRedistribuida(v => !v)}
                title="Alternar horas reales / compensadas"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${vistaRedistribuida
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                    : 'text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                    }`}
            >
                <Shuffle size={13} />
                {vistaRedistribuida ? 'Comp.' : 'Real'}
            </button>

            {/* View mode toggle */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
                <button
                    onClick={() => setViewMode('resumen')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'resumen'
                        ? 'bg-white dark:bg-neutral-700 text-olive-600 dark:text-olive-400 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                >
                    <Eye size={13} />
                    Resumen
                </button>
                <button
                    onClick={() => setViewMode('detalle')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'detalle'
                        ? 'bg-white dark:bg-neutral-700 text-olive-600 dark:text-olive-400 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                >
                    <List size={13} />
                    Detalle
                </button>
            </div>

            {/* Export */}
            <button
                onClick={handleExport}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title="Exportar CSV"
            >
                <Download size={15} />
            </button>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                    <Calendar className="w-7 h-7 text-olive-600" />
                    Mi Hoja de Horas
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Control mensual de horas trabajadas
                </p>
            </div>

            {/* ── Unified filter bar ── */}
            <TimeControlFilters
                periods={['month']}
                showUserFilter={true}
                showDepartmentFilter={true}
                showSearch={viewMode === 'resumen'}
                searchPlaceholder="Buscar proyecto, nota..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                defaultPeriod="month"
                onChange={handleFilterChange}
                actions={filterBarActions}
            />

            {/* ── Content ── */}
            {viewMode === 'detalle' ? (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-1">
                    <DailyHoursView userId={selectedUserId} readOnly={true} />
                </div>
            ) : (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[40vh]">
                            <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
                                <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Cargando datos...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-500 font-bold mb-2">Error al cargar datos</p>
                            <p className="text-neutral-500 mb-4">{error}</p>
                            <button onClick={cargarDatos} className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
                                Reintentar
                            </button>
                        </div>
                    ) : datos ? (
                        <>
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {/* Horas Reales */}
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-20 h-20 bg-olive-50 dark:bg-olive-900/10 rounded-bl-full -mr-3 -mt-3 transition-transform group-hover:scale-110"></div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                            <div className="p-1 bg-olive-100 dark:bg-olive-900/30 text-olive-600 rounded-md">
                                                <Clock size={14} />
                                            </div>
                                            Horas Reales
                                        </div>
                                        <div className="text-2xl font-black text-olive-600 dark:text-olive-500">
                                            {formatHoras(datos.horasReales)}
                                        </div>
                                    </div>
                                </div>

                                {/* Previstas */}
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                        <div className="p-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-md">
                                            <Calendar size={14} />
                                        </div>
                                        Previstas
                                    </div>
                                    <div className="text-2xl font-bold text-neutral-700 dark:text-neutral-200">
                                        {formatHoras(datos.horasPrevistas)}
                                    </div>
                                </div>

                                {/* Diferencia */}
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                        <div className={`p-1 rounded-md ${datos.diferencia >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                            {datos.diferencia >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        </div>
                                        Diferencia
                                    </div>
                                    <div className={`text-2xl font-bold ${getColorDiferencia(datos.diferencia)}`}>
                                        {formatDiferencia(datos.diferencia)}
                                    </div>
                                </div>

                                {/* Sin Imputar */}
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                        <div className="p-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-md">
                                            <AlertTriangle size={14} />
                                        </div>
                                        Sin Imputar
                                    </div>
                                    <div className={`text-2xl font-bold ${getColorDiasSinImputar(datos.diasSinImputar).text}`}>
                                        {datos.diasSinImputar} <span className="text-xs font-normal text-neutral-400">días</span>
                                    </div>
                                </div>

                                {/* Cumplimiento */}
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                        <div className={`p-1 rounded-md ${datos.porcentajeCumplimiento >= 100 ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-600'}`}>
                                            <TrendingUp size={14} />
                                        </div>
                                        Cumplimiento
                                    </div>
                                    <div className={`text-2xl font-bold ${datos.porcentajeCumplimiento >= 100 ? 'text-green-600' : datos.porcentajeCumplimiento >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {datos.porcentajeCumplimiento}%
                                    </div>
                                </div>
                            </div>

                            {/* Daily detail table */}
                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/20">
                                    <h3 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-olive-600" />
                                        Detalle Diario
                                        {vistaRedistribuida && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                                <Shuffle size={10} /> Compensada
                                            </span>
                                        )}
                                    </h3>
                                    {datos && <span className="text-xs text-neutral-500">{datos.diasLaborables} días laborables</span>}
                                </div>

                                {/* Table header */}
                                <div className="hidden md:grid grid-cols-10 bg-neutral-100/50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                    <div className="col-span-1 px-4 py-2.5 text-center">Día</div>
                                    <div className="col-span-1 px-4 py-2.5 text-center">Sem.</div>
                                    <div className="col-span-6 px-4 py-2.5">Proyectos / Actividad</div>
                                    <div className="col-span-2 px-4 py-2.5 text-center">Total</div>
                                </div>

                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {datos.diasDelMes
                                        .filter((dia) => {
                                            if (!searchQuery) return true;
                                            const query = searchQuery.toLowerCase();
                                            const matchesProject = dia.horasPorProyecto.some(
                                                p => p.projectCode.toLowerCase().includes(query) ||
                                                    (p.projectName && p.projectName.toLowerCase().includes(query))
                                            );
                                            const matchesNotes = dia.notas.some(n => n.toLowerCase().includes(query));
                                            return matchesProject || matchesNotes;
                                        })
                                        .map((dia) => {
                                            const compDia = datos.diasCompensados[dia.dia - 1];
                                            const totalMostrado = vistaRedistribuida
                                                ? (compDia?.totalHorasCompensado ?? dia.totalHoras)
                                                : dia.totalHoras;
                                            const horasCompensacion = vistaRedistribuida ? (compDia?.horasCompensacion ?? 0) : 0;
                                            const horasSobrantes = vistaRedistribuida ? (compDia?.horasSobrantes ?? 0) : 0;

                                            return (
                                                <div
                                                    key={dia.dia}
                                                    className={`group md:grid md:grid-cols-10 items-center transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${!dia.esLaborable
                                                        ? 'bg-neutral-50/50 dark:bg-neutral-900/50'
                                                        : vistaRedistribuida && horasCompensacion > 0
                                                            ? 'bg-emerald-50/40 dark:bg-emerald-900/10'
                                                            : vistaRedistribuida && horasSobrantes > 0
                                                                ? 'bg-amber-50/40 dark:bg-amber-900/10'
                                                                : 'bg-white dark:bg-neutral-900'
                                                        }`}
                                                >
                                                    {/* Mobile row header */}
                                                    <div className="flex md:hidden items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/30">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{dia.dia}</span>
                                                            <span className="text-sm text-neutral-500">{dia.diaSemanaLabel}</span>
                                                        </div>
                                                        <div className="font-bold">{totalMostrado > 0 ? formatHoras(totalMostrado) : '-'}</div>
                                                    </div>

                                                    {/* Day number */}
                                                    <div className="hidden md:block col-span-1 px-4 py-3 text-center">
                                                        <div className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full font-bold text-xs ${dia.estado === 'vacio' && dia.esLaborable ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                            {dia.dia}
                                                        </div>
                                                    </div>

                                                    {/* Day name */}
                                                    <div className="hidden md:block col-span-1 px-4 py-3 text-center text-xs font-medium text-neutral-500">
                                                        {dia.diaSemanaLabel.slice(0, 3)}
                                                    </div>

                                                    {/* Projects */}
                                                    <div className="col-span-12 md:col-span-6 px-4 py-2.5 md:py-3">
                                                        <div className="flex flex-wrap gap-1.5 mb-0.5">
                                                            {dia.horasPorProyecto.length > 0 ? (
                                                                <>
                                                                    {dia.horasPorProyecto.map((p, pIdx) => (
                                                                        <div key={pIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-olive-50 dark:bg-olive-900/20 border border-olive-100 dark:border-olive-900/30 text-[11px] font-semibold text-olive-700 dark:text-olive-300">
                                                                            <span className="opacity-70">{p.projectCode}:</span>
                                                                            <span>{p.hours}h</span>
                                                                        </div>
                                                                    ))}
                                                                    {vistaRedistribuida && horasCompensacion > 0 && (
                                                                        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                                                            +{formatHoras(horasCompensacion)} comp.
                                                                        </div>
                                                                    )}
                                                                    {vistaRedistribuida && horasSobrantes > 0 && (
                                                                        <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                                                            {formatHoras(horasSobrantes)} →saldo
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-neutral-400 italic">
                                                                    {dia.esAusencia
                                                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md font-semibold not-italic">
                                                                            🏖️ {ABSENCE_TYPE_LABELS[dia.tipoAusencia || ''] || 'Ausencia'}
                                                                        </span>
                                                                        : dia.esFestivo
                                                                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md font-semibold not-italic">
                                                                                🎉 {dia.nombreFestivo || 'Festivo'}
                                                                            </span>
                                                                            : !dia.esLaborable ? 'No laborable' : 'Sin actividad registrada'
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                        {dia.notas.length > 0 && (
                                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                                                                {dia.notas.join('. ')}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Total hours */}
                                                    <div className="hidden md:block col-span-2 px-4 py-3 text-center">
                                                        <span className={`font-bold text-base ${totalMostrado >= 8 ? 'text-green-600 dark:text-green-400' : totalMostrado > 0 ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-700'}`}>
                                                            {totalMostrado > 0 ? formatHoras(totalMostrado) : '—'}
                                                        </span>
                                                        {vistaRedistribuida && dia.esLaborable && !dia.esAusencia && compDia?.saldoTrasElDia > 0 && (
                                                            <div className="text-[9px] text-amber-500 dark:text-amber-400 font-semibold mt-0.5">
                                                                saldo: {formatHoras(compDia.saldoTrasElDia)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Distribution by project */}
                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <HardHat className="w-4 h-4 text-neutral-500" />
                                    Distribución por Proyecto
                                </h3>
                                <div className="space-y-3">
                                    {datos.totalesPorProyecto.map((proyecto) => {
                                        const percentage = Math.min(100, Math.round((proyecto.hours / datos.horasReales) * 100));
                                        return (
                                            <div key={proyecto.projectId} className="group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded transition-colors group-hover:bg-olive-100 dark:group-hover:bg-olive-900/30 group-hover:text-olive-700 dark:group-hover:text-olive-300">
                                                            {proyecto.projectCode}
                                                        </span>
                                                        <span className="text-xs text-neutral-500 truncate max-w-[200px] md:max-w-xs" title={proyecto.projectName}>
                                                            {proyecto.projectName}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{formatHoras(proyecto.hours)}</span>
                                                        <span className="text-xs text-neutral-400 ml-1.5">({percentage}%)</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-olive-500 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {datos.totalesPorProyecto.length === 0 && (
                                        <div className="text-center py-6 text-neutral-500">
                                            <HardHat className="w-8 h-8 mx-auto text-neutral-200 dark:text-neutral-700 mb-2" />
                                            No hay horas registradas este mes
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></div>Completo</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30"></div>Incompleto</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30"></div>Sin imputar</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-50 dark:bg-blue-900/20"></div>Ausencia</div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-neutral-50 dark:bg-neutral-800/50"></div>No laborable</div>
                            </div>
                        </>
                    ) : null}
                </>
            )}
        </div>
    );
}
