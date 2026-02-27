'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, List, Eye, Search, X, HardHat } from 'lucide-react';
import DailyHoursView from '@/components/hours/DailyHoursView';
import { getMiHoja } from '@/app/(protected)/control-horas/actions';
import {
    formatHoras,
    formatDiferencia,
    getColorDiasSinImputar,
    getColorDiferencia,
    MESES,
    ABSENCE_TYPE_LABELS,
    type ResumenMensual
} from '@/app/(protected)/control-horas/utils';

export default function HoursPage() {
    const [viewMode, setViewMode] = useState<'detalle' | 'resumen'>('detalle');
    const [año, setAño] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [datos, setDatos] = useState<ResumenMensual | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (viewMode === 'resumen') {
            cargarResumen();
        }
    }, [año, mes, viewMode]);

    const cargarResumen = async () => {
        setLoading(true);
        try {
            const result = await getMiHoja(año, mes);
            setDatos(result);
        } catch (err) {
            console.error('Error cargando resumen:', err);
        } finally {
            setLoading(false);
        }
    };

    const cambiarMes = (delta: number) => {
        let nuevoMes = mes + delta;
        let nuevoAño = año;
        if (nuevoMes < 0) { nuevoMes = 11; nuevoAño--; }
        else if (nuevoMes > 11) { nuevoMes = 0; nuevoAño++; }
        setMes(nuevoMes);
        setAño(nuevoAño);
    };

    return (
        <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex items-center gap-3">
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('detalle')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${viewMode === 'detalle'
                            ? 'bg-white dark:bg-neutral-700 shadow-sm text-olive-600 dark:text-olive-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                            }`}
                    >
                        <List size={16} />
                        Detalle
                    </button>
                    <button
                        onClick={() => setViewMode('resumen')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${viewMode === 'resumen'
                            ? 'bg-white dark:bg-neutral-700 shadow-sm text-olive-600 dark:text-olive-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                            }`}
                    >
                        <Eye size={16} />
                        Resumen
                    </button>
                </div>
            </div>

            {viewMode === 'detalle' ? (
                <DailyHoursView />
            ) : (
                <>
                    {/* Month Selector */}
                    <div className="flex items-center justify-center gap-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                        <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center min-w-[200px]">
                            <h2 className="text-xl font-bold">{MESES[mes]} {año}</h2>
                            {datos && <p className="text-sm text-neutral-500">{datos.diasLaborables} días laborables</p>}
                        </div>
                        <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : datos ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-olive-50 dark:bg-olive-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium mb-2">
                                            <div className="p-1.5 bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400 rounded-lg">
                                                <Clock size={16} />
                                            </div>
                                            Horas Reales
                                        </div>
                                        <div className="text-3xl font-black text-olive-600 dark:text-olive-500">
                                            {formatHoras(datos.horasReales)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium mb-2">
                                        <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-lg">
                                            <Calendar size={16} />
                                        </div>
                                        Horas Previstas
                                    </div>
                                    <div className="text-3xl font-bold text-neutral-700 dark:text-neutral-200">
                                        {formatHoras(datos.horasPrevistas)}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium mb-2">
                                        <div className={`p-1.5 rounded-lg ${datos.diferencia >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                            {datos.diferencia >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        </div>
                                        Diferencia
                                    </div>
                                    <div className={`text-3xl font-bold ${getColorDiferencia(datos.diferencia)}`}>
                                        {formatDiferencia(datos.diferencia)}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium mb-2">
                                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                            <AlertTriangle size={16} />
                                        </div>
                                        Sin Imputar
                                    </div>
                                    <div className={`text-3xl font-bold ${getColorDiasSinImputar(datos.diasSinImputar).text}`}>
                                        {datos.diasSinImputar} <span className="text-sm font-normal text-neutral-400">días</span>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium mb-2">
                                        <div className={`p-1.5 rounded-lg ${datos.porcentajeCumplimiento >= 100 ? 'bg-green-100 text-green-600' : datos.porcentajeCumplimiento >= 80 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                            <TrendingUp size={16} />
                                        </div>
                                        Cumplimiento
                                    </div>
                                    <div className={`text-3xl font-bold ${datos.porcentajeCumplimiento >= 100 ? 'text-green-600' : datos.porcentajeCumplimiento >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {datos.porcentajeCumplimiento}%
                                    </div>
                                </div>
                            </div>

                            {/* Detalle Diario (Daily Detail Table) */}
                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-800/20">
                                    <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-olive-600" />
                                        Detalle Diario
                                    </h3>
                                    <div className="relative w-full sm:w-auto">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar proyecto, nota..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full sm:w-72 pl-9 pr-8 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Table Header */}
                                <div className="hidden md:grid grid-cols-10 bg-neutral-100/50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    <div className="col-span-1 px-4 py-3 text-center">Día</div>
                                    <div className="col-span-1 px-4 py-3 text-center">Semana</div>
                                    <div className="col-span-6 px-4 py-3">Proyectos / Actividad</div>
                                    <div className="col-span-2 px-4 py-3 text-center">Total</div>
                                </div>

                                {/* Daily Rows */}
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {datos.diasDelMes
                                        .filter(dia => {
                                            if (!searchQuery) return true;
                                            const query = searchQuery.toLowerCase();
                                            const matchesProject = dia.horasPorProyecto.some(
                                                p => p.projectCode.toLowerCase().includes(query) ||
                                                    (p.projectName && p.projectName.toLowerCase().includes(query))
                                            );
                                            const matchesNotes = dia.notas.some(n => n.toLowerCase().includes(query));
                                            return matchesProject || matchesNotes;
                                        })
                                        .map((dia) => (
                                            <div
                                                key={dia.dia}
                                                className={`group md:grid md:grid-cols-10 items-center transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${!dia.esLaborable ? 'bg-neutral-50/50 dark:bg-neutral-900/50' : 'bg-white dark:bg-neutral-900'}`}
                                            >
                                                {/* Mobile Row Header */}
                                                <div className="flex md:hidden items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/30">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{dia.dia}</span>
                                                        <span className="text-sm text-neutral-500">{dia.diaSemanaLabel}</span>
                                                    </div>
                                                    <div className="font-bold">{dia.totalHoras > 0 ? formatHoras(dia.totalHoras) : '-'}</div>
                                                </div>

                                                {/* Day Number */}
                                                <div className="hidden md:block col-span-1 px-4 py-4 text-center">
                                                    <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full font-bold text-sm ${dia.estado === 'vacio' && dia.esLaborable ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-neutral-700 dark:text-neutral-300 group-hover:bg-white dark:group-hover:bg-neutral-700'}`}>
                                                        {dia.dia}
                                                    </div>
                                                </div>

                                                {/* Day Name */}
                                                <div className="hidden md:block col-span-1 px-4 py-4 text-center text-sm font-medium text-neutral-500">
                                                    {dia.diaSemanaLabel.slice(0, 3)}
                                                </div>

                                                {/* Projects & Notes */}
                                                <div className="col-span-12 md:col-span-6 px-4 py-3 md:py-4">
                                                    <div className="flex flex-wrap gap-2 mb-1">
                                                        {dia.horasPorProyecto.length > 0 ? (
                                                            dia.horasPorProyecto.map((p, idx) => (
                                                                <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-olive-50 dark:bg-olive-900/20 border border-olive-100 dark:border-olive-900/30 text-xs font-semibold text-olive-700 dark:text-olive-300">
                                                                    <span className="opacity-70">{p.projectCode}:</span>
                                                                    <span>{p.hours}h</span>
                                                                </div>
                                                            ))
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
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1 flex items-center gap-1">
                                                            <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                                                            {dia.notas.join('. ')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Total Hours */}
                                                <div className="hidden md:block col-span-2 px-4 py-4 text-center">
                                                    <span className={`font-bold text-lg ${dia.totalHoras >= 8 ? 'text-green-600 dark:text-green-400' : dia.totalHoras > 0 ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-700'}`}>
                                                        {dia.totalHoras > 0 ? formatHoras(dia.totalHoras) : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Distribución por Proyecto */}
                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <HardHat className="w-5 h-5 text-neutral-500" />
                                    Distribución por Proyecto
                                </h3>
                                <div className="space-y-4">
                                    {datos.totalesPorProyecto.map((proyecto) => {
                                        const percentage = Math.min(100, Math.round((proyecto.hours / datos.horasReales) * 100));
                                        return (
                                            <div key={proyecto.projectId} className="group">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded transition-colors group-hover:bg-olive-100 dark:group-hover:bg-olive-900/30 group-hover:text-olive-700 dark:group-hover:text-olive-300">
                                                            {proyecto.projectCode}
                                                        </span>
                                                        <span className="text-sm text-neutral-500 truncate max-w-[200px] md:max-w-xs" title={proyecto.projectName}>
                                                            {proyecto.projectName}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{formatHoras(proyecto.hours)}</span>
                                                        <span className="text-xs text-neutral-400 ml-2">({percentage}%)</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-olive-500 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {datos.totalesPorProyecto.length === 0 && (
                                        <div className="text-center py-8 text-neutral-500">
                                            <HardHat className="w-10 h-10 mx-auto text-neutral-200 dark:text-neutral-700 mb-2" />
                                            No hay horas registradas este mes
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Leyenda */}
                            <div className="flex items-center gap-6 text-sm text-neutral-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30"></div>
                                    Día completo
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30"></div>
                                    Día incompleto
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30"></div>
                                    Sin imputar
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-900/20"></div>
                                    Ausencia
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-neutral-50 dark:bg-neutral-800/50"></div>
                                    No laborable
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-neutral-500">No hay datos disponibles para este mes.</div>
                    )}
                </>
            )}
        </div>
    );
}
