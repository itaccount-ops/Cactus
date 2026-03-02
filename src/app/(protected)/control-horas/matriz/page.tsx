'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
    ChevronLeft, ChevronRight, Search, X, Download,
    BarChart3, Users, Clock, TrendingUp, TrendingDown, CalendarDays, Filter,
} from 'lucide-react';
import { getMatrizHoras, getDepartamentosConUsuarios } from '../actions';
import { MESES, formatHoras, type ResultadoMatriz, type MatrizPersonaInfo } from '../utils';
import { useSession } from 'next-auth/react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// ── Helpers ──────────────────────────────────────────────────────────────────

function r(n: number) { return Math.round(n * 10) / 10; }

function CeldaHoras({ reales, calculadas, highlight = false }: {
    reales: number; calculadas: number; highlight?: boolean;
}) {
    const desviacion = r(calculadas - reales);
    const tieneDesviacion = Math.abs(desviacion) >= 0.1;
    return (
        <td className={`px-2 py-2 text-right text-xs tabular-nums border-l border-neutral-100 dark:border-neutral-800 ${highlight ? 'bg-olive-50/50 dark:bg-olive-900/10' : ''}`}>
            <div className={`font-bold ${calculadas > 0 ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-700'}`}>
                {calculadas > 0 ? `${calculadas}h` : '—'}
            </div>
            <div className={`text-[10px] ${reales > 0 ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-300 dark:text-neutral-700'}`}>
                {reales > 0 ? `${reales}h` : '—'}
            </div>
            {tieneDesviacion && reales > 0 && (
                <div className={`text-[9px] font-semibold ${desviacion > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {desviacion > 0 ? '+' : ''}{desviacion}h
                </div>
            )}
        </td>
    );
}

function Avatar({ name, image, size = 'sm' }: { name: string; image: string | null; size?: 'sm' | 'xs' }) {
    const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-5 h-5 text-[10px]';
    if (image) return <img src={image} alt={name} className={`${dim} rounded-full object-cover border border-neutral-200 dark:border-neutral-700`} />;
    return (
        <div className={`${dim} rounded-full bg-olive-100 dark:bg-olive-900/50 border border-olive-200 dark:border-olive-800 flex items-center justify-center font-bold text-olive-700 dark:text-olive-300`}>
            {name[0]?.toUpperCase()}
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string; sub?: string;
    icon: React.ComponentType<{ className?: string }>; color: string;
}) {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
                {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MatrizHorasPage() {
    const { data: session } = useSession();

    const [año, setAño] = useState(new Date().getFullYear());
    const [mes, setMes] = useState<number | null>(new Date().getMonth());
    const [datos, setDatos] = useState<ResultadoMatriz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtros
    const [busquedaProyecto, setBusquedaProyecto] = useState('');
    const [personasFiltradas, setPersonasFiltradas] = useState<Set<string>>(new Set());
    const [departamentoFiltro, setDepartamentoFiltro] = useState('');
    const [projectFilters, setProjectFilters] = useState<string[]>([]);
    const [departments, setDepartments] = useState<{ id: string; label: string; color: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);

    // Load projects and departments
    useEffect(() => {
        getDepartamentosConUsuarios().then(setDepartments).catch(console.error);
        import('../actions').then(m => m.getProyectosActivos().then(setProjects).catch(console.error));
    }, []);

    // Cargar datos
    useEffect(() => {
        cargar();
    }, [año, mes, departamentoFiltro, projectFilters]);

    const cargar = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getMatrizHoras(año, mes, departamentoFiltro || undefined, projectFilters.length > 0 ? projectFilters : undefined);
            setDatos(data);
        } catch (e: any) {
            setError(e.message || 'Error al cargar la matriz');
        } finally {
            setLoading(false);
        }
    };

    const cambiarMes = (delta: number) => {
        if (mes === null) return;
        let nm = mes + delta;
        let na = año;
        if (nm < 0) { nm = 11; na--; }
        if (nm > 11) { nm = 0; na++; }
        setMes(nm);
        setAño(na);
    };

    // Personas visibles (filtradas)
    const personasVisibles = useMemo<MatrizPersonaInfo[]>(() => {
        if (!datos) return [];
        return personasFiltradas.size === 0
            ? datos.personas
            : datos.personas.filter(p => personasFiltradas.has(p.userId));
    }, [datos, personasFiltradas]);

    // Proyectos filtrados por búsqueda
    const proyectosFiltrados = useMemo(() => {
        if (!datos) return [];
        const q = busquedaProyecto.toLowerCase();
        if (!q) return datos.proyectos;
        return datos.proyectos.filter(p =>
            p.projectCode.toLowerCase().includes(q) ||
            p.projectName.toLowerCase().includes(q)
        );
    }, [datos, busquedaProyecto]);

    // Toggle persona en filtro
    const togglePersona = (userId: string) => {
        setPersonasFiltradas(prev => {
            const next = new Set(prev);
            next.has(userId) ? next.delete(userId) : next.add(userId);
            return next;
        });
    };

    // Exportar CSV
    const exportarCSV = () => {
        if (!datos) return;
        const personas = personasVisibles;
        const headers = [
            'Proyecto', 'Referencia',
            ...personas.flatMap(p => [`${p.userName} Calc.`, `${p.userName} Reales`]),
            'Total Calc.', 'Total Reales'
        ];
        const rows = proyectosFiltrados.map(p => [
            p.projectCode, p.projectName,
            ...personas.flatMap(per => [
                p.celdas[per.userId]?.calculadas ?? 0,
                p.celdas[per.userId]?.reales ?? 0,
            ]),
            p.totales.calculadas, p.totales.reales
        ]);
        const totRow = [
            'TOTALES', '',
            ...personas.flatMap(p => [p.calculadas, p.reales]),
            datos.totalesGlobales.calculadas, datos.totalesGlobales.reales
        ];
        const csv = [headers, ...rows, totRow].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matriz-horas-${mes !== null ? MESES[mes] : 'anual'}-${año}.csv`;
        a.click();
    };

    const periodoLabel = mes !== null ? `${MESES[mes]} ${año}` : `Anual ${año}`;

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-olive-600" />
                        Matriz de Horas
                        <span className="text-sm font-normal text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                            {periodoLabel}
                        </span>
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">
                        Proyectos × Personas — Calculadas / Reales
                    </p>
                </div>

                {/* Controles de período */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Anual / Mensual toggle */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                        <button
                            onClick={() => setMes(null)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mes === null ? 'bg-white dark:bg-neutral-700 text-olive-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                        >
                            Anual
                        </button>
                        <button
                            onClick={() => setMes(new Date().getMonth())}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mes !== null ? 'bg-white dark:bg-neutral-700 text-olive-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                        >
                            Mensual
                        </button>
                    </div>

                    {/* Navegación mes */}
                    {mes !== null && (
                        <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2 py-1">
                            <button onClick={() => cambiarMes(-1)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-bold min-w-[110px] text-center">{MESES[mes]} {año}</span>
                            <button onClick={() => cambiarMes(1)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Selector año para vista anual */}
                    {mes === null && (
                        <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2 py-1">
                            <button onClick={() => setAño(a => a - 1)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-bold min-w-[50px] text-center">{año}</span>
                            <button onClick={() => setAño(a => a + 1)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Department filter */}
                    <div className="min-w-[180px]">
                        <SearchableSelect
                            options={[
                                { value: '', label: 'Todos los dptos.' },
                                ...departments.map(d => ({ value: d.id, label: d.label })),
                            ]}
                            value={departamentoFiltro}
                            onChange={setDepartamentoFiltro}
                            placeholder="Departamento..."
                            searchPlaceholder="Buscar dpto..."
                            startIcon={<Filter size={14} />}
                        />
                    </div>

                    <button
                        onClick={exportarCSV}
                        disabled={!datos}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm font-semibold transition-colors disabled:opacity-40"
                    >
                        <Download size={16} /> CSV
                    </button>

                    {/* TimeControlFilters handles projects array via its callbacks*/}
                    <div className="flex-1 min-w-[300px]" style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0 }}>
                        {/* We instantiate it hidden here just so it handles fetching list and internal state.
                             A much better integration would be to merge its logic in but since
                             it is designed as a standalone wrapper we'll instantiate it invisibly 
                             while passing on parameters. Or rather, let's just make it visible
                             and remove the duplicate Month/Year controls
                          */}
                    </div>
                </div>
            </div>

            {/* Instead of the custom headers we could use TimeControlFilters here */}
            {/* But since Matriz already has very specific custom controls above,
                let's just inject the project filter component directly if we don't 
                want to rewrite the UI. Since TimeControlFilters is quite heavy, 
                we'll add the projectFilter inside the Matriz filter bar instead for cleaner UI. 
            */}

            {/* ── Stats ── */}
            {datos && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Calculadas"
                        value={formatHoras(datos.totalesGlobales.calculadas)}
                        sub={`${datos.proyectos.length} proyectos · ${datos.personas.length} personas`}
                        icon={BarChart3}
                        color="bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400"
                    />
                    <StatCard
                        label="Total Reales"
                        value={formatHoras(datos.totalesGlobales.reales)}
                        sub={`vs ${formatHoras(datos.totalesGlobales.calculadas)} calculadas`}
                        icon={Clock}
                        color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    />
                    <StatCard
                        label="Horas Previstas"
                        value={formatHoras(datos.totalesGlobales.previstas)}
                        icon={CalendarDays}
                        color="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    />
                    <StatCard
                        label="Desviación"
                        value={`${r(datos.totalesGlobales.reales - datos.totalesGlobales.previstas) >= 0 ? '+' : ''}${formatHoras(r(datos.totalesGlobales.reales - datos.totalesGlobales.previstas))}`}
                        sub="Reales − Previstas"
                        icon={datos.totalesGlobales.reales >= datos.totalesGlobales.previstas ? TrendingUp : TrendingDown}
                        color={datos.totalesGlobales.reales >= datos.totalesGlobales.previstas
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'}
                    />
                </div>
            )}

            {/* ── Filtros ── */}
            {datos && (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Buscador proyectos */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Filtrar vista..."
                            value={busquedaProyecto}
                            onChange={e => setBusquedaProyecto(e.target.value)}
                            className="w-full pl-8 pr-8 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-olive-500 outline-none"
                        />
                        {busquedaProyecto && (
                            <button onClick={() => setBusquedaProyecto('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Selector Proyectos Multiselect Frontend */}
                    <div className="min-w-[200px] max-w-xs flex-1">
                        <div className="flex flex-col gap-2 relative group w-full">
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl cursor-default text-sm w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                <span className="text-neutral-500 font-medium truncate shrink-0">Proyectos:</span>
                                {projectFilters.length === 0 ? (
                                    <span className="text-neutral-400">Todos</span>
                                ) : (
                                    <span className="font-bold text-olive-600 truncate">{projectFilters.length} seleccionados</span>
                                )}
                            </div>

                            {/* Dropdown multi-select */}
                            <div className="absolute top-full left-0 mt-1 w-[260px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-[300px] flex flex-col overflow-hidden">
                                <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-800/50">
                                    <p className="text-[10px] font-black uppercase text-neutral-400">Seleccionar Proyectos</p>
                                </div>
                                <div className="overflow-y-auto p-1.5 hover:scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700 max-h-[250px]">
                                    {projects.map(p => {
                                        const isSelected = projectFilters.includes(p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    const newIds = isSelected
                                                        ? projectFilters.filter(id => id !== p.id)
                                                        : [...projectFilters, p.id];
                                                    setProjectFilters(newIds);
                                                }}
                                                className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-olive-50 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 font-semibold' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                                                    }`}
                                            >
                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-olive-500 border-olive-500 text-white' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
                                                    }`}>
                                                    {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                </div>
                                                <span className="font-mono text-[10px] opacity-70 shrink-0">{p.code}</span>
                                                <span className="truncate" title={p.name}>{p.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Filtro por personas */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1">
                                    <Users size={13} /> Personas:
                                </span>
                                {datos.personas.map(p => (
                                    <button
                                        key={p.userId}
                                        onClick={() => togglePersona(p.userId)}
                                        title={p.userName}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${personasFiltradas.has(p.userId) || personasFiltradas.size === 0
                                            ? 'bg-olive-600 text-white border-olive-600'
                                            : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 opacity-50'
                                            }`}
                                    >
                                        <Avatar name={p.userName} image={p.userImage} size="xs" />
                                        <span className="hidden sm:inline max-w-[80px] truncate">{p.userName.split(' ')[0]}</span>
                                    </button>
                                ))}
                                {personasFiltradas.size > 0 && (
                                    <button onClick={() => setPersonasFiltradas(new Set())} className="text-xs text-neutral-400 hover:text-neutral-600 underline ml-1">
                                        mostrar todos
                                    </button>
                                )}
                            </div>

                            {/* ── Tabla Matriz ── */}
                            {
                                loading ? (
                                    <div className="flex items-center justify-center min-h-[40vh]">
                                        <div className="flex items-center gap-3 text-neutral-500">
                                            <div className="w-6 h-6 border-2 border-olive-600 border-t-transparent rounded-full animate-spin" />
                                            Cargando matriz...
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-16">
                                        <p className="text-red-500 font-bold mb-2">Error al cargar la matriz</p>
                                        <p className="text-neutral-500 mb-4">{error}</p>
                                        <button onClick={cargar} className="px-4 py-2 bg-olive-600 text-white rounded-xl hover:bg-olive-700">
                                            Reintentar
                                        </button>
                                    </div>
                                ) : datos && (
                                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-sm" style={{ minWidth: `${200 + personasVisibles.length * 120 + 120}px` }}>
                                                <thead>
                                                    {/* Fila 1: cabeceras de persona */}
                                                    <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b-2 border-neutral-200 dark:border-neutral-700">
                                                        <th rowSpan={2} className="sticky left-0 z-20 bg-neutral-50 dark:bg-neutral-800/60 text-left px-4 py-3 text-xs font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-wider min-w-[200px] border-r border-neutral-200 dark:border-neutral-700">
                                                            Proyecto
                                                        </th>
                                                        {personasVisibles.map((p, i) => (
                                                            <th key={p.userId} colSpan={2}
                                                                className={`text-center px-2 py-2 border-l border-neutral-200 dark:border-neutral-700 ${i % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-800/60' : 'bg-white dark:bg-neutral-900'}`}
                                                            >
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <Avatar name={p.userName} image={p.userImage} size="sm" />
                                                                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 max-w-[80px] truncate" title={p.userName}>
                                                                        {p.userName.split(' ')[0]}
                                                                    </span>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th colSpan={2} className="text-center px-2 py-2 border-l-2 border-neutral-300 dark:border-neutral-600 bg-olive-50 dark:bg-olive-900/20 text-xs font-black text-olive-700 dark:text-olive-400 uppercase tracking-wide">
                                                            Total
                                                        </th>
                                                    </tr>

                                                    {/* Fila 2: sub-cabeceras Calc / Real */}
                                                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                                        {personasVisibles.map((p, i) => (
                                                            <Fragment key={p.userId}>
                                                                <th
                                                                    className={`text-center px-2 py-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-l border-neutral-200 dark:border-neutral-700 ${i % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-800/60' : ''}`}
                                                                >Calc.</th>
                                                                <th
                                                                    className={`text-center px-2 py-1.5 text-[10px] font-semibold text-blue-500 dark:text-blue-400 ${i % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-800/60' : ''}`}
                                                                >Real</th>
                                                            </Fragment>
                                                        ))}
                                                        <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-l-2 border-neutral-300 dark:border-neutral-600 bg-olive-50 dark:bg-olive-900/20">Calc.</th>
                                                        <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-blue-500 dark:text-blue-400 bg-olive-50 dark:bg-olive-900/20">Real</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {proyectosFiltrados.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={2 + personasVisibles.length * 2} className="text-center py-12 text-neutral-400 text-sm">
                                                                {busquedaProyecto ? `Sin resultados para "${busquedaProyecto}"` : 'Sin horas registradas en este período'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        proyectosFiltrados.map((proyecto, pi) => {
                                                            const stripeClass = pi % 2 === 0 ? '' : 'bg-neutral-50/50 dark:bg-neutral-800/20';
                                                            return (
                                                                <tr key={proyecto.projectId} className={`group hover:bg-olive-50/40 dark:hover:bg-olive-900/10 transition-colors ${stripeClass}`}>
                                                                    {/* Columna proyecto (sticky) */}
                                                                    <td className={`sticky left-0 z-10 px-4 py-3 border-r border-neutral-200 dark:border-neutral-700 border-b border-neutral-100 dark:border-neutral-800 ${stripeClass} group-hover:bg-olive-50/60 dark:group-hover:bg-olive-900/20 transition-colors`}>
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="font-bold text-xs text-olive-700 dark:text-olive-400 font-mono">{proyecto.projectCode}</span>
                                                                            <span className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[160px] truncate" title={proyecto.projectName}>
                                                                                {proyecto.projectName}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Celdas por persona */}
                                                                    {personasVisibles.map((persona, i) => {
                                                                        const celda = proyecto.celdas[persona.userId] ?? { reales: 0, calculadas: 0 };
                                                                        return (
                                                                            <>
                                                                                <td key={`${persona.userId}-c`}
                                                                                    className={`px-2 py-2 text-right text-xs tabular-nums border-l border-b border-neutral-100 dark:border-neutral-800 font-semibold ${celda.calculadas > 0 ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-700'}`}
                                                                                >
                                                                                    {celda.calculadas > 0 ? `${celda.calculadas}h` : '—'}
                                                                                </td>
                                                                                <td key={`${persona.userId}-r`}
                                                                                    className={`px-2 py-2 text-right text-xs tabular-nums border-b border-neutral-100 dark:border-neutral-800 ${celda.reales > celda.calculadas && celda.reales > 0
                                                                                        ? 'text-red-500 dark:text-red-400 font-semibold'
                                                                                        : celda.calculadas > celda.reales && celda.calculadas > 0
                                                                                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                                                                            : celda.reales > 0 ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-300 dark:text-neutral-700'
                                                                                        }`}
                                                                                >
                                                                                    {celda.reales > 0 ? `${celda.reales}h` : '—'}
                                                                                </td>
                                                                            </>
                                                                        );
                                                                    })}

                                                                    {/* Total fila */}
                                                                    <td className="px-2 py-2 text-right text-xs font-bold tabular-nums border-l-2 border-neutral-300 dark:border-neutral-600 border-b border-neutral-100 dark:border-neutral-800 bg-olive-50/60 dark:bg-olive-900/10 text-neutral-800 dark:text-neutral-200">
                                                                        {proyecto.totales.calculadas > 0 ? `${proyecto.totales.calculadas}h` : '—'}
                                                                    </td>
                                                                    <td className={`px-2 py-2 text-right text-xs font-bold tabular-nums border-b border-neutral-100 dark:border-neutral-800 bg-olive-50/60 dark:bg-olive-900/10 ${proyecto.totales.reales > proyecto.totales.calculadas
                                                                        ? 'text-red-500 dark:text-red-400'
                                                                        : 'text-neutral-800 dark:text-neutral-200'
                                                                        }`}>
                                                                        {proyecto.totales.reales > 0 ? `${proyecto.totales.reales}h` : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>

                                                {/* ── Footer: totales por persona ── */}
                                                <tfoot>
                                                    {/* Fila Calculadas totales */}
                                                    <tr className="border-t-2 border-neutral-300 dark:border-neutral-600 bg-neutral-100/80 dark:bg-neutral-800/80 font-bold">
                                                        <td className="sticky left-0 z-10 bg-neutral-100 dark:bg-neutral-800 px-4 py-3 border-r border-neutral-200 dark:border-neutral-700 text-xs font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">
                                                            Calculadas
                                                        </td>
                                                        {personasVisibles.map((p, i) => (
                                                            <>
                                                                <td key={`tot-c-${p.userId}`} className="px-2 py-3 text-right text-xs font-black border-l border-neutral-200 dark:border-neutral-700 tabular-nums text-emerald-700 dark:text-emerald-400">
                                                                    {p.calculadas > 0 ? `${p.calculadas}h` : '—'}
                                                                </td>
                                                                <td key={`tot-r-${p.userId}`} className="px-2 py-3 text-right text-xs font-black tabular-nums text-blue-600 dark:text-blue-400">
                                                                    {p.reales > 0 ? `${p.reales}h` : '—'}
                                                                </td>
                                                            </>
                                                        ))}
                                                        <td className="px-2 py-3 text-right text-xs font-black border-l-2 border-neutral-300 dark:border-neutral-600 bg-olive-100 dark:bg-olive-900/30 text-emerald-700 dark:text-emerald-400 tabular-nums">
                                                            {datos.totalesGlobales.calculadas > 0 ? `${datos.totalesGlobales.calculadas}h` : '—'}
                                                        </td>
                                                        <td className="px-2 py-3 text-right text-xs font-black bg-olive-100 dark:bg-olive-900/30 text-blue-600 dark:text-blue-400 tabular-nums">
                                                            {datos.totalesGlobales.reales > 0 ? `${datos.totalesGlobales.reales}h` : '—'}
                                                        </td>
                                                    </tr>

                                                    {/* Fila Previstas */}
                                                    <tr className="bg-neutral-50/80 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-700">
                                                        <td className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-800/40 px-4 py-2.5 border-r border-neutral-200 dark:border-neutral-700 text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                                                            Previstas
                                                        </td>
                                                        {personasVisibles.map(p => (
                                                            <td key={`prev-${p.userId}`} colSpan={2} className="px-2 py-2.5 text-center text-xs font-semibold border-l border-neutral-200 dark:border-neutral-700 tabular-nums text-neutral-500 dark:text-neutral-400">
                                                                {p.previstas > 0 ? `${p.previstas}h` : '—'}
                                                            </td>
                                                        ))}
                                                        <td colSpan={2} className="px-2 py-2.5 text-center text-xs font-bold border-l-2 border-neutral-300 dark:border-neutral-600 bg-olive-50/60 dark:bg-olive-900/10 tabular-nums text-neutral-600 dark:text-neutral-400">
                                                            {datos.totalesGlobales.previstas > 0 ? `${datos.totalesGlobales.previstas}h` : '—'}
                                                        </td>
                                                    </tr>

                                                    {/* Fila Desviación (Reales − Previstas) */}
                                                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/20 border-t border-neutral-200 dark:border-neutral-700">
                                                        <td className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-800/20 px-4 py-2.5 border-r border-neutral-200 dark:border-neutral-700 text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                                                            Desviación
                                                        </td>
                                                        {personasVisibles.map(p => {
                                                            const desv = r(p.reales - p.previstas);
                                                            return (
                                                                <td key={`desv-${p.userId}`} colSpan={2}
                                                                    className={`px-2 py-2.5 text-center text-xs font-bold border-l border-neutral-200 dark:border-neutral-700 tabular-nums ${desv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                                                                >
                                                                    {desv >= 0 ? '+' : ''}{desv}h
                                                                </td>
                                                            );
                                                        })}
                                                        <td colSpan={2} className={`px-2 py-2.5 text-center text-xs font-bold border-l-2 border-neutral-300 dark:border-neutral-600 bg-olive-50/60 dark:bg-olive-900/10 tabular-nums ${r(datos.totalesGlobales.reales - datos.totalesGlobales.previstas) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                            {r(datos.totalesGlobales.reales - datos.totalesGlobales.previstas) >= 0 ? '+' : ''}
                                                            {r(datos.totalesGlobales.reales - datos.totalesGlobales.previstas)}h
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {/* Leyenda */}
                                        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-6 text-xs text-neutral-400 flex-wrap">
                                            <span className="font-semibold text-neutral-500">Leyenda:</span>
                                            <div className="flex items-center gap-1.5"><span className="font-bold text-emerald-600">Calc.</span> = horas con compensación secuencial (cap 8h/día)</div>
                                            <div className="flex items-center gap-1.5"><span className="font-bold text-blue-500">Real</span> = horas imputadas originales (intocables)</div>
                                            <div className="flex items-center gap-1.5"><span className="text-red-400 font-bold">Rojo</span> = Real &gt; Calculadas</div>
                                            <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">Verde</span> = Calculadas &gt; Reales (compensación recibida)</div>
                                        </div>
                                    </div>
                                )
                            }
                        </div >
                        );
}
