'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Clock, AlertTriangle, Eye, Download, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { getEquipoResumen, getAnualResumen } from '../actions';
import TimeControlFilters, { type FilterState } from '@/components/control-horas/TimeControlFilters';
import {
    formatHoras,
    formatDiferencia,
    formatFecha,
    getColorDiasSinImputar,
    getColorDiferencia,
    MESES_CORTO,
    DEPARTMENT_COLORS,
    type ResumenUsuarioEquipo
} from '../utils';

// ── Types ────────────────────────────────────────────────────────────────────
type ResumenAnualUsuario = {
    userId: string;
    userName: string;
    department: string;
    departmentColor: string;
    horasPorMes: number[];
    totalHoras: number;
    horasPrevistas: number;
    diferencia: number;
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function EquipoPage() {
    const [currentPeriod, setCurrentPeriod] = useState<'month' | 'year'>('month');
    const [año, setAño] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [departamentoFiltro, setDepartamentoFiltro] = useState('');
    const [userIdFiltro, setUserIdFiltro] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Monthly data
    const [datosMes, setDatosMes] = useState<ResumenUsuarioEquipo[]>([]);

    // Annual data
    const [datosAnual, setDatosAnual] = useState<{
        usuarios: ResumenAnualUsuario[];
        totalesPorMes: number[];
        totalGlobal: number;
    } | null>(null);

    // ── Load data ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (currentPeriod === 'month') cargarMensual();
        else cargarAnual();
    }, [año, mes, departamentoFiltro, currentPeriod]);

    const cargarMensual = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getEquipoResumen(año, mes, departamentoFiltro || undefined);
            setDatosMes(result);
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const cargarAnual = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getAnualResumen(año, departamentoFiltro || undefined);
            setDatosAnual(result);
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // ── Filter changes ───────────────────────────────────────────────────────
    const handleFilterChange = (filters: FilterState) => {
        setAño(filters.año);
        setMes(filters.mes);
        setDepartamentoFiltro(filters.departmentId);
        setCurrentPeriod(filters.period as 'month' | 'year');
        setUserIdFiltro(filters.userIds[0] || '');
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = () => {
        if (currentPeriod === 'month') exportMonth();
        else exportYear();
    };

    const exportMonth = () => {
        const headers = ['Trabajador', 'Departamento', 'Último Día', 'Días Sin Imputar', 'H. Previstas', 'H. Reales', 'Diferencia', '%'];
        const rows = filteredMonth.map(u => [
            u.userName, u.departmentLabel,
            u.ultimoDiaImputado ? formatFecha(new Date(u.ultimoDiaImputado)) : 'Nunca',
            u.diasSinImputar, u.horasPrevistas, u.horasReales, u.diferencia, u.porcentajeCumplimiento + '%'
        ]);
        downloadCSV(headers, rows, `equipo-mensual-${año}-${mes + 1}`);
    };

    const exportYear = () => {
        if (!datosAnual) return;
        const headers = ['Trabajador', 'Dpto.', ...MESES_CORTO, 'Total', 'Previstas', 'Dif.'];
        const rows = filteredYear.map(u => [
            u.userName, u.department, ...u.horasPorMes, u.totalHoras, u.horasPrevistas, u.diferencia
        ]);
        rows.push(['TOTAL', '', ...datosAnual.totalesPorMes, datosAnual.totalGlobal, '', '']);
        downloadCSV(headers, rows, `equipo-anual-${año}`);
    };

    const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
    };

    // ── Filtered data ────────────────────────────────────────────────────────
    const filteredMonth = datosMes.filter(u => {
        if (userIdFiltro && u.userId !== userIdFiltro) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return u.userName.toLowerCase().includes(q) || u.userEmail.toLowerCase().includes(q);
    });

    const filteredYear = (datosAnual?.usuarios ?? []).filter(u => {
        if (userIdFiltro && u.userId !== userIdFiltro) return false;
        if (!searchQuery) return true;
        return u.userName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // ── Monthly stats ────────────────────────────────────────────────────────
    const totalHoras = datosMes.reduce((sum, u) => sum + u.horasReales, 0);
    const avgCumplimiento = datosMes.length > 0
        ? Math.round(datosMes.reduce((sum, u) => sum + u.porcentajeCumplimiento, 0) / datosMes.length)
        : 0;
    const usuariosProblematicos = datosMes.filter(u => u.diasSinImputar > 3).length;

    // ── Action bar items ─────────────────────────────────────────────────────
    const filterBarActions = (
        <button
            onClick={handleExport}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="Exportar CSV"
        >
            <Download size={15} />
        </button>
    );

    // ── Error state ──────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">{error}</p>
                <button
                    onClick={() => currentPeriod === 'month' ? cargarMensual() : cargarAnual()}
                    className="mt-4 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                    <Users className="w-7 h-7 text-olive-600" />
                    Control de Equipo
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    {currentPeriod === 'month' ? 'Vista mensual de horas del equipo' : 'Resumen anual de horas por trabajador'}
                </p>
            </div>

            {/* ── Unified filter bar with period tabs ── */}
            <TimeControlFilters
                periods={['month', 'year']}
                showUserFilter={true}
                showDepartmentFilter={true}
                showSearch={true}
                searchPlaceholder="Buscar empleado..."
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                defaultPeriod="month"
                onChange={handleFilterChange}
                actions={filterBarActions}
            />

            {/* === MONTHLY VIEW === */}
            {currentPeriod === 'month' && (
                <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                <div className="p-1 bg-olive-100 dark:bg-olive-900/30 text-olive-600 rounded-md"><Users size={14} /></div>
                                Trabajadores
                            </div>
                            <div className="text-2xl font-bold text-olive-600">{datosMes.length}</div>
                        </div>

                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                <div className="p-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-md"><Clock size={14} /></div>
                                Total Horas
                            </div>
                            <div className="text-2xl font-bold text-neutral-700 dark:text-neutral-200">{formatHoras(totalHoras)}</div>
                        </div>

                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                <div className="p-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-md"><Calendar size={14} /></div>
                                Cumplimiento Medio
                            </div>
                            <div className={`text-2xl font-bold ${avgCumplimiento >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                {avgCumplimiento}%
                            </div>
                        </div>

                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-1.5">
                                <div className="p-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-md"><AlertTriangle size={14} /></div>
                                Con Retraso (&gt;3 días)
                            </div>
                            <div className={`text-2xl font-bold ${usuariosProblematicos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {usuariosProblematicos}
                            </div>
                        </div>
                    </div>

                    {/* Team table (monthly) */}
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : filteredMonth.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500">
                                No hay usuarios para mostrar
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Trabajador</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Dpto.</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Último Día</th>
                                            <th className="text-center px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Sin Imputar</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Previstas</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Reales</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">Dif.</th>
                                            <th className="text-center px-4 py-2.5 text-xs font-bold uppercase text-neutral-500">%</th>
                                            <th className="px-4 py-2.5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                        {filteredMonth.map((usuario) => {
                                            const colorDias = getColorDiasSinImputar(usuario.diasSinImputar);
                                            return (
                                                <tr key={usuario.userId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            {usuario.userImage ? (
                                                                <img src={usuario.userImage} alt={usuario.userName} className="w-7 h-7 rounded-full" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-500">
                                                                    {usuario.userName.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-sm">{usuario.userName}</div>
                                                                <div className="text-[11px] text-neutral-500">{usuario.userEmail}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[11px] font-medium text-white"
                                                            style={{ backgroundColor: usuario.departmentColor }}
                                                        >
                                                            {usuario.departmentLabel}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                                                        {usuario.ultimoDiaImputado
                                                            ? formatFecha(new Date(usuario.ultimoDiaImputado))
                                                            : <span className="text-neutral-400">Nunca</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${colorDias.bg} ${colorDias.text}`}>
                                                            {usuario.diasSinImputar}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-xs">{formatHoras(usuario.horasPrevistas)}</td>
                                                    <td className="px-4 py-2.5 text-right text-xs font-medium">{formatHoras(usuario.horasReales)}</td>
                                                    <td className={`px-4 py-2.5 text-right text-xs font-bold ${getColorDiferencia(usuario.diferencia)}`}>
                                                        {formatDiferencia(usuario.diferencia)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className={`text-xs font-bold ${usuario.porcentajeCumplimiento >= 100 ? 'text-green-600' :
                                                            usuario.porcentajeCumplimiento >= 80 ? 'text-amber-600' : 'text-red-600'
                                                            }`}>
                                                            {usuario.porcentajeCumplimiento}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <Link
                                                            href={`/control-horas/mi-hoja?userId=${usuario.userId}&año=${año}&mes=${mes}`}
                                                            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg inline-flex text-olive-600"
                                                            title="Ver hoja"
                                                        >
                                                            <Eye size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                        <span className="font-medium">Días sin imputar:</span>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></div>0 (al día)</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30"></div>1-3 días</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30"></div>&gt;3 (urgente)</div>
                    </div>
                </>
            )}

            {/* === ANNUAL VIEW === */}
            {currentPeriod === 'year' && (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : !datosAnual || filteredYear.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            No hay datos para este año
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px]">
                                <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-xs font-bold uppercase text-neutral-500 sticky left-0 bg-neutral-50 dark:bg-neutral-800 min-w-[170px]">
                                            Trabajador
                                        </th>
                                        <th className="text-left px-2 py-2.5 text-xs font-bold uppercase text-neutral-500 min-w-[50px]">
                                            Dpto.
                                        </th>
                                        {MESES_CORTO.map((m, i) => (
                                            <th key={i} className="text-right px-2 py-2.5 text-xs font-bold uppercase text-neutral-500 min-w-[48px]">
                                                {m}
                                            </th>
                                        ))}
                                        <th className="text-right px-3 py-2.5 text-xs font-bold uppercase text-neutral-500 bg-olive-50 dark:bg-olive-900/20">
                                            Total
                                        </th>
                                        <th className="text-right px-3 py-2.5 text-xs font-bold uppercase text-neutral-500">
                                            Prev.
                                        </th>
                                        <th className="text-right px-3 py-2.5 text-xs font-bold uppercase text-neutral-500">
                                            Dif.
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {filteredYear.map((usuario) => (
                                        <tr key={usuario.userId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                            <td className="px-4 py-2 sticky left-0 bg-white dark:bg-neutral-900 font-medium text-sm">
                                                {usuario.userName}
                                            </td>
                                            <td className="px-2 py-2">
                                                <div
                                                    className="w-3 h-3 rounded-full inline-block"
                                                    style={{ backgroundColor: usuario.departmentColor }}
                                                    title={usuario.department}
                                                ></div>
                                            </td>
                                            {usuario.horasPorMes.map((horas, m) => (
                                                <td key={m} className="px-2 py-2 text-right text-xs">
                                                    {horas > 0 ? (
                                                        <span className={horas < 100 ? 'text-amber-600' : ''}>{horas}</span>
                                                    ) : (
                                                        <span className="text-neutral-300 dark:text-neutral-600">-</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-3 py-2 text-right font-bold text-olive-600 bg-olive-50/50 dark:bg-olive-900/10">
                                                {formatHoras(usuario.totalHoras)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs text-neutral-500">
                                                {formatHoras(usuario.horasPrevistas)}
                                            </td>
                                            <td className={`px-3 py-2 text-right text-xs font-bold ${getColorDiferencia(usuario.diferencia)}`}>
                                                {formatDiferencia(usuario.diferencia)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals row */}
                                    <tr className="bg-olive-50 dark:bg-olive-900/20 font-bold border-t-2 border-olive-200 dark:border-olive-800">
                                        <td className="px-4 py-2.5 sticky left-0 bg-olive-50 dark:bg-olive-900/20 text-sm">TOTAL</td>
                                        <td></td>
                                        {datosAnual.totalesPorMes.map((total, m) => (
                                            <td key={m} className="px-2 py-2.5 text-right text-xs">
                                                {total > 0 ? total : '-'}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2.5 text-right text-olive-700 dark:text-olive-400 bg-olive-100/50 dark:bg-olive-900/30">
                                            {formatHoras(datosAnual.totalGlobal)}
                                        </td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {currentPeriod === 'year' && datosAnual && filteredYear.length > 0 && (() => {
                const uniqueDepts = Array.from(new Set(filteredYear.map(u => u.department)));
                return (
                    <div className="flex items-center gap-3 flex-wrap text-xs text-neutral-500">
                        <span className="font-medium">Departamentos:</span>
                        {uniqueDepts.map(dept => (
                            <div key={dept} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS.OTHER }}></div>
                                <span>{dept}</span>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {currentPeriod === 'year' && (
                <p className="text-xs text-neutral-400">
                    💡 Celdas en ámbar = meses con menos de 100h registradas
                </p>
            )}
        </div>
    );
}
