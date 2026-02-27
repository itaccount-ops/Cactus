'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Clock,
    TrendingUp,
    Filter,
    Search,
    SortAsc,
    SortDesc,
    RefreshCw
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
    getAllTimeEntries,
    getFilterableUsers,
    getFilterableProjects,
    type TimeEntryFilters
} from '@/lib/work-time-tracking/actions';
import { Department, TimeEntryStatus } from '@prisma/client';

// Department labels and colors
const DEPARTMENT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    CIVIL_DESIGN: { label: 'Diseño y Civil', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    ELECTRICAL: { label: 'Eléctrico', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    INSTRUMENTATION: { label: 'Instrumentación', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    ADMINISTRATION: { label: 'Administración', color: 'text-green-700', bgColor: 'bg-green-100' },
    IT: { label: 'Informática', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
    ECONOMIC: { label: 'Económico', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    MARKETING: { label: 'Marketing', color: 'text-pink-700', bgColor: 'bg-pink-100' },
    OTHER: { label: 'Otros', color: 'text-neutral-700', bgColor: 'bg-neutral-100' }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-neutral-700', bgColor: 'bg-neutral-100' },
    SUBMITTED: { label: 'Pendiente', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    APPROVED: { label: 'Aprobado', color: 'text-green-700', bgColor: 'bg-green-100' },
    REJECTED: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100' }
};

interface TimeEntry {
    id: string;
    userId: string;
    date: Date;
    hours: number;
    notes: string | null;
    status: TimeEntryStatus;
    startTime: string | null;
    endTime: string | null;
    submittedAt: Date | null;
    approvedAt: Date | null;
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
    approvedBy?: {
        id: string;
        name: string;
    } | null;
}

interface FilterUser {
    id: string;
    name: string;
    email: string;
    department: string;
}

interface FilterProject {
    id: string;
    code: string;
    name: string;
    department: string;
}

export default function GlobalHoursControlPage() {
    // View mode: 'entries' shows all time entries, 'summary' shows worker summary
    const [viewMode, setViewMode] = useState<'entries' | 'summary'>('entries');

    // Entries data
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [totalEntries, setTotalEntries] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filter options
    const [users, setUsers] = useState<FilterUser[]>([]);
    const [projects, setProjects] = useState<FilterProject[]>([]);

    // Active filters
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [sortBy, setSortBy] = useState<'date' | 'user' | 'project' | 'hours'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load filter options on mount
    useEffect(() => {
        loadFilterOptions();
    }, []);

    // Load entries when filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            loadEntries();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [selectedUser, selectedDepartment, selectedProject, selectedStatus, sortBy, sortOrder, currentPage, searchTerm]);

    const loadFilterOptions = async () => {
        try {
            const [usersData, projectsData] = await Promise.all([
                getFilterableUsers(),
                getFilterableProjects()
            ]);
            setUsers(usersData);
            setProjects(projectsData);
        } catch (err) {
            console.error('Error loading filter options:', err);
        }
    };

    const loadEntries = async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: TimeEntryFilters = {
                sortBy,
                sortOrder,
                page: currentPage,
                limit: 50
            };

            if (selectedUser) filters.userId = selectedUser;
            if (selectedDepartment) filters.department = selectedDepartment as Department;
            if (selectedProject) filters.projectId = selectedProject;
            if (selectedStatus) filters.status = selectedStatus as TimeEntryStatus;
            if (searchTerm) filters.searchTerm = searchTerm;

            const result = await getAllTimeEntries(filters);
            setEntries(result.entries);
            setTotalEntries(result.total);
            setTotalPages(result.totalPages);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Stats calculation
    const stats = useMemo(() => {
        const total = entries.length;
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        const pending = entries.filter(e => e.status === 'SUBMITTED').length;
        const approved = entries.filter(e => e.status === 'APPROVED').length;
        const draft = entries.filter(e => e.status === 'DRAFT').length;

        return { total, totalHours, pending, approved, draft };
    }, [entries]);

    const toggleSort = (field: 'date' | 'user' | 'project' | 'hours') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const clearFilters = () => {
        setSelectedUser('');
        setSelectedDepartment('');
        setSelectedProject('');
        setSelectedStatus('');
        setSortBy('date');
        setSortOrder('desc');
        setSearchTerm('');
        setCurrentPage(1);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="flex flex-col min-h-full bg-neutral-50 dark:bg-neutral-900 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Control Global de Horas
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400 font-medium">
                        Visualización de todas las horas registradas
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadEntries}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards - Simplified without approval stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-700"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Entradas</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalEntries}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-700"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-olive-600 dark:text-olive-400" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Horas</p>
                            <p className="text-2xl font-bold text-olive-600 dark:text-olive-400">{stats.totalHours.toFixed(1)}h</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-neutral-500" />
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Filtros:</span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-sm w-48"
                        />
                    </div>

                    {/* User filter */}
                    <div className="min-w-[200px]">
                        <SearchableSelect
                            options={[
                                { value: '', label: 'Todos los usuarios' },
                                ...users.map(u => ({ value: u.id, label: u.name }))
                            ]}
                            value={selectedUser}
                            onChange={(val) => { setSelectedUser(val); setCurrentPage(1); }}
                            placeholder="Usuario"
                            searchPlaceholder="Buscar usuario..."
                            startIcon={<Users size={16} />}
                        />
                    </div>

                    {/* Department filter */}
                    <div className="min-w-[200px]">
                        <SearchableSelect
                            options={[
                                { value: '', label: 'Todos los departamentos' },
                                ...Object.entries(DEPARTMENT_CONFIG).map(([key, { label }]) => ({ value: key, label }))
                            ]}
                            value={selectedDepartment}
                            onChange={(val) => { setSelectedDepartment(val); setCurrentPage(1); }}
                            placeholder="Departamento"
                            searchPlaceholder="Buscar departamento..."
                        />
                    </div>

                    {/* Project filter */}
                    <div className="min-w-[200px]">
                        <SearchableSelect
                            options={[
                                { value: '', label: 'Todos los proyectos' },
                                ...projects.map(p => ({ value: p.id, label: p.code, subLabel: p.name }))
                            ]}
                            value={selectedProject}
                            onChange={(val) => { setSelectedProject(val); setCurrentPage(1); }}
                            placeholder="Proyecto"
                            searchPlaceholder="Buscar proyecto..."
                        />
                    </div>



                    {/* Clear filters button */}
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {/* Error State */}
            {
                error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )
            }

            {/* Entries Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
            >
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-neutral-900 dark:text-neutral-100">
                        Registros de Horas ({totalEntries})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                            <tr>
                                <th
                                    className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    onClick={() => toggleSort('date')}
                                >
                                    <div className="flex items-center gap-1">
                                        Fecha
                                        {sortBy === 'date' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    onClick={() => toggleSort('user')}
                                >
                                    <div className="flex items-center gap-1">
                                        Trabajador
                                        {sortBy === 'user' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Departamento</th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    onClick={() => toggleSort('project')}
                                >
                                    <div className="flex items-center gap-1">
                                        Proyecto
                                        {sortBy === 'project' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    onClick={() => toggleSort('hours')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Horas
                                        {sortBy === 'hours' && (sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-neutral-500">Cargando...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                                        <Clock size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="text-lg font-medium">No hay registros de horas</p>
                                        <p className="text-sm">Intenta ajustar los filtros</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map(entry => {
                                    const deptConfig = DEPARTMENT_CONFIG[entry.user.department] || DEPARTMENT_CONFIG.OTHER;

                                    return (
                                        <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                            <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 font-medium">
                                                {formatDate(entry.date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold">
                                                        {entry.user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{entry.user.name}</p>
                                                        <p className="text-xs text-neutral-500">{entry.user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${deptConfig.bgColor} ${deptConfig.color}`}>
                                                    {deptConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-olive-600 dark:text-olive-400">{entry.project.code}</span>
                                                <span className="text-neutral-500 ml-2">{entry.project.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                                                {entry.hours.toFixed(2)}h
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500 text-sm max-w-xs truncate">
                                                {entry.notes || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                        <p className="text-sm text-neutral-500">
                            Página {currentPage} de {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
