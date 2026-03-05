'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    Filter,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    AlertTriangle,
    Users,
    Calendar,
    Building2,
    Loader2,
    CheckSquare,
    Square
} from 'lucide-react';
import {
    getPendingApprovals,
    approveTimeEntries,
    rejectTimeEntries,
    getFilterableUsers
} from '@/lib/work-time-tracking/actions';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface TimeEntry {
    id: string;
    date: Date;
    hours: number;
    notes: string | null;
    status: string;
    startTime: string | null;
    endTime: string | null;
    submittedAt: Date | null;
    rejectionReason: string | null;
    user: {
        id: string;
        name: string;
        email: string;
        department: string;
        image: string | null;
    };
    project: {
        id: string;
        code: string;
        name: string;
    };
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────
const DEPARTMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    CIVIL_DESIGN: { label: 'Diseño y Civil', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    ELECTRICAL: { label: 'Eléctrico', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    INSTRUMENTATION: { label: 'Instrumentación', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    ADMINISTRATION: { label: 'Administración', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30' },
    IT: { label: 'Informática', color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    ECONOMIC: { label: 'Económico', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    MARKETING: { label: 'Marketing', color: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    OTHER: { label: 'Otros', color: 'text-neutral-700 dark:text-neutral-300', bg: 'bg-neutral-100 dark:bg-neutral-800' },
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function HoursApprovalPage() {
    // ── Data ──────────────────────────────────────────────────
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
    const [users, setUsers] = useState<{ id: string; name: string; department: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Filters ───────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // ── Selection ─────────────────────────────────────────────
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // ── Actions ───────────────────────────────────────────────
    const [actionLoading, setActionLoading] = useState<string | null>(null); // id or 'bulk'
    const [showRejectModal, setShowRejectModal] = useState<'single' | 'bulk' | null>(null);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // ── Toast ─────────────────────────────────────────────────
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Load data ────────────────────────────────────────────
    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [data, usersData] = await Promise.all([
                getPendingApprovals(),
                getFilterableUsers()
            ]);
            setEntries(data as unknown as TimeEntry[]);
            setUsers(usersData.map((u: any) => ({ id: u.id, name: u.name, department: u.department })));
        } catch (e: any) {
            showToast('error', e.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Filter logic ──────────────────────────────────────────
    useEffect(() => {
        let result = [...entries];
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(e =>
                e.user.name.toLowerCase().includes(q) ||
                e.project.code.toLowerCase().includes(q) ||
                e.project.name.toLowerCase().includes(q)
            );
        }
        if (filterDept) result = result.filter(e => e.user.department === filterDept);
        if (filterUser) result = result.filter(e => e.user.id === filterUser);
        if (filterDateFrom) result = result.filter(e => new Date(e.date) >= new Date(filterDateFrom));
        if (filterDateTo) result = result.filter(e => new Date(e.date) <= new Date(filterDateTo + 'T23:59:59'));
        setFilteredEntries(result);
        // Remove selected items that no longer appear
        setSelected(prev => new Set([...prev].filter(id => result.find(e => e.id === id))));
    }, [entries, search, filterDept, filterUser, filterDateFrom, filterDateTo]);

    // ── Selection helpers ─────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const selectAll = () => setSelected(new Set(filteredEntries.map(e => e.id)));
    const clearSelection = () => setSelected(new Set());
    const allSelected = filteredEntries.length > 0 && selected.size === filteredEntries.length;

    // ── Approve ───────────────────────────────────────────────
    const handleApprove = async (ids: string[]) => {
        setActionLoading(ids.length === 1 ? ids[0] : 'bulk');
        try {
            await approveTimeEntries(ids);
            showToast('success', `${ids.length > 1 ? `${ids.length} entradas aprobadas` : 'Entrada aprobada'} correctamente`);
            clearSelection();
            await loadData(true);
        } catch (e: any) {
            showToast('error', e.message || 'Error al aprobar');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Reject ────────────────────────────────────────────────
    const openRejectModal = (mode: 'single' | 'bulk', id?: string) => {
        setRejectTargetId(id || null);
        setRejectReason('');
        setShowRejectModal(mode);
    };
    const confirmReject = async () => {
        if (!rejectReason.trim()) return;
        const ids = showRejectModal === 'single' && rejectTargetId
            ? [rejectTargetId]
            : [...selected];
        setActionLoading(ids.length === 1 ? ids[0] : 'bulk');
        setShowRejectModal(null);
        try {
            await rejectTimeEntries(ids, rejectReason);
            showToast('success', `${ids.length > 1 ? `${ids.length} entradas rechazadas` : 'Entrada rechazada'}`);
            clearSelection();
            setRejectReason('');
            await loadData(true);
        } catch (e: any) {
            showToast('error', e.message || 'Error al rechazar');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Stats ──────────────────────────────────────────────────
    const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
    const deptCounts: Record<string, number> = {};
    entries.forEach(e => {
        deptCounts[e.user.department] = (deptCounts[e.user.department] || 0) + 1;
    });
    const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];

    // ── Render ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin text-olive-600" />
                    <span className="font-medium">Cargando aprobaciones…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Toast ── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === 'success'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Clock className="w-7 h-7 text-olive-600 dark:text-olive-500" />
                        Aprobación de Horas
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium text-sm">
                        Gestión y aprobación de horas extras pendientes
                    </p>
                </div>
                <button
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all font-bold text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* ── Stats Cards ────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Pendientes</span>
                    </div>
                    <p className="text-3xl font-black text-neutral-900 dark:text-neutral-100">{entries.length}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">solicitudes en espera</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-olive-100 dark:bg-olive-900/30 rounded-xl">
                            <Clock className="w-5 h-5 text-olive-600 dark:text-olive-400" />
                        </div>
                        <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Horas en revisión</span>
                    </div>
                    <p className="text-3xl font-black text-neutral-900 dark:text-neutral-100">{totalHours.toFixed(1)}h</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">total acumulado pendiente</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Dpto. más activo</span>
                    </div>
                    <p className="text-xl font-black text-neutral-900 dark:text-neutral-100 truncate">
                        {topDept ? (DEPARTMENT_CONFIG[topDept[0]]?.label ?? topDept[0]) : '—'}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {topDept ? `${topDept[1]} solicitudes` : 'Sin solicitudes'}
                    </p>
                </motion.div>
            </div>

            {/* ── Filters ────────────────────────────────────── */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar por empleado, proyecto..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-500 text-neutral-900 dark:text-neutral-100 font-medium"
                        />
                    </div>
                    {/* Toggle filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${showFilters || filterDept || filterUser || filterDateFrom || filterDateTo
                                ? 'bg-olive-50 dark:bg-olive-900/20 border-olive-300 dark:border-olive-700 text-olive-700 dark:text-olive-300'
                                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                        {(filterDept || filterUser || filterDateFrom || filterDateTo) && (
                            <span className="w-2 h-2 rounded-full bg-olive-600" />
                        )}
                    </button>
                </div>

                {/* Expanded filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-neutral-100 dark:border-neutral-800"
                        >
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Department */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Departamento</label>
                                    <select
                                        value={filterDept}
                                        onChange={e => { setFilterDept(e.target.value); setFilterUser(''); }}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 text-neutral-900 dark:text-neutral-100 font-medium"
                                    >
                                        <option value="">Todos los departamentos</option>
                                        {Object.entries(DEPARTMENT_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* User */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Empleado</label>
                                    <select
                                        value={filterUser}
                                        onChange={e => setFilterUser(e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 text-neutral-900 dark:text-neutral-100 font-medium"
                                    >
                                        <option value="">Todos los empleados</option>
                                        {users
                                            .filter(u => !filterDept || u.department === filterDept)
                                            .map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                    </select>
                                </div>
                                {/* Date from */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Desde</label>
                                    <input
                                        type="date"
                                        value={filterDateFrom}
                                        onChange={e => setFilterDateFrom(e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 text-neutral-900 dark:text-neutral-100 font-medium"
                                    />
                                </div>
                                {/* Date to */}
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Hasta</label>
                                    <input
                                        type="date"
                                        value={filterDateTo}
                                        onChange={e => setFilterDateTo(e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/30 text-neutral-900 dark:text-neutral-100 font-medium"
                                    />
                                </div>
                            </div>
                            {(filterDept || filterUser || filterDateFrom || filterDateTo) && (
                                <div className="px-4 pb-4">
                                    <button
                                        onClick={() => { setFilterDept(''); setFilterUser(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Main Table ─────────────────────────────────── */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={allSelected ? clearSelection : selectAll}
                            className="p-1 text-neutral-500 hover:text-olive-600 transition-colors"
                            title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        >
                            {allSelected ? (
                                <CheckSquare className="w-5 h-5 text-olive-600" />
                            ) : (
                                <Square className="w-5 h-5" />
                            )}
                        </button>
                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                            {filteredEntries.length} solicitudes
                            {search || filterDept || filterUser || filterDateFrom || filterDateTo
                                ? ` (filtradas de ${entries.length})`
                                : ''}
                        </span>
                    </div>
                    {selected.size > 0 && (
                        <span className="text-xs font-bold text-olive-600 dark:text-olive-400 bg-olive-50 dark:bg-olive-900/20 px-3 py-1 rounded-full">
                            {selected.size} seleccionadas
                        </span>
                    )}
                </div>

                {filteredEntries.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                        </div>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                            {entries.length === 0 ? '¡Todo al día!' : 'Sin resultados'}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {entries.length === 0
                                ? 'No hay horas extras pendientes de aprobación'
                                : 'Prueba a cambiar los filtros de búsqueda'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {filteredEntries.map(entry => {
                            const isSelected = selected.has(entry.id);
                            const isExpanded = expandedId === entry.id;
                            const isActioning = actionLoading === entry.id;
                            const dept = DEPARTMENT_CONFIG[entry.user.department];
                            const dateLabel = new Date(entry.date).toLocaleDateString('es-ES', {
                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                            });

                            return (
                                <div key={entry.id} className={`transition-colors ${isSelected ? 'bg-olive-50/50 dark:bg-olive-900/10' : ''}`}>
                                    {/* Row */}
                                    <div className={`flex items-center gap-4 px-5 py-4 ${isActioning ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {/* Checkbox */}
                                        <button onClick={() => toggleSelect(entry.id)} className="shrink-0 p-0.5 text-neutral-400 hover:text-olive-600 transition-colors">
                                            {isSelected
                                                ? <CheckSquare className="w-5 h-5 text-olive-600" />
                                                : <Square className="w-5 h-5" />}
                                        </button>

                                        {/* Avatar */}
                                        <div className="shrink-0">
                                            {entry.user.image ? (
                                                <img
                                                    src={entry.user.image}
                                                    alt={entry.user.name}
                                                    className="w-10 h-10 rounded-xl object-cover border-2 border-neutral-100 dark:border-neutral-700"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-olive-700 dark:text-olive-300 font-black text-sm">
                                                    {entry.user.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                <span className="font-black text-neutral-900 dark:text-neutral-100 text-sm">{entry.user.name}</span>
                                                {dept && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dept.bg} ${dept.color}`}>
                                                        {dept.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {dateLabel}
                                                </span>
                                                <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-700 dark:text-neutral-300 font-bold">
                                                    {entry.project.code}
                                                </span>
                                                <span>{entry.project.name}</span>
                                            </div>
                                        </div>

                                        {/* Hours badge */}
                                        <div className="shrink-0 text-center">
                                            <span className="block text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">{Number(entry.hours).toFixed(1)}</span>
                                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">horas extra</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove([entry.id])}
                                                disabled={!!actionLoading}
                                                className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                                title="Aprobar"
                                            >
                                                {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => openRejectModal('single', entry.id)}
                                                disabled={!!actionLoading}
                                                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                                                title="Rechazar"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Rechazar
                                            </button>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-16 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                                                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1">Empleado</p>
                                                        <p className="font-bold text-neutral-900 dark:text-neutral-100">{entry.user.name}</p>
                                                        <p className="text-neutral-500 dark:text-neutral-400 text-xs">{entry.user.email}</p>
                                                    </div>
                                                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                                                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1">Detalles de la entrada</p>
                                                        {entry.startTime && entry.endTime && (
                                                            <p className="font-mono text-neutral-700 dark:text-neutral-300 font-bold">{entry.startTime} – {entry.endTime}</p>
                                                        )}
                                                        {entry.submittedAt && (
                                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                                Enviada el {new Date(entry.submittedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                                                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1">Notas</p>
                                                        <p className="text-neutral-700 dark:text-neutral-300 italic text-xs">
                                                            {entry.notes || <span className="not-italic text-neutral-400">Sin notas</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Bulk Action Bar ─────────────────────────────── */}
            <AnimatePresence>
                {selected.size > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-6 py-4 rounded-2xl shadow-2xl border border-neutral-700 dark:border-neutral-300"
                    >
                        <Users className="w-5 h-5 opacity-60 shrink-0" />
                        <span className="font-black text-sm">{selected.size} seleccionadas</span>
                        <div className="w-px h-6 bg-neutral-700 dark:bg-neutral-300" />
                        <button
                            onClick={() => handleApprove([...selected])}
                            disabled={actionLoading === 'bulk'}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                            {actionLoading === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Aprobar seleccionadas
                        </button>
                        <button
                            onClick={() => openRejectModal('bulk')}
                            disabled={actionLoading === 'bulk'}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                            Rechazar seleccionadas
                        </button>
                        <button
                            onClick={clearSelection}
                            className="p-2 text-neutral-400 dark:text-neutral-600 hover:text-neutral-200 dark:hover:text-neutral-900 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Reject Modal ────────────────────────────────── */}
            <AnimatePresence>
                {showRejectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowRejectModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-md"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">
                                    {showRejectModal === 'bulk' ? `Rechazar ${selected.size} entradas` : 'Rechazar entrada'}
                                </h3>
                            </div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                El empleado recibirá una notificación con el motivo indicado.
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Describe el motivo del rechazo..."
                                rows={3}
                                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-neutral-900 dark:text-neutral-100 resize-none"
                            />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setShowRejectModal(null)}
                                    className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmReject}
                                    disabled={!rejectReason.trim()}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Rechazo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
