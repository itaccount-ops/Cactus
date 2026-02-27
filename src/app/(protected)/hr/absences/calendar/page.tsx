'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle, XCircle, UserMinus, Search, Filter, List, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getYearlyAbsences, getEmployeesForFilter, getHolidaysForCalendar, deleteAbsence, deleteAbsences } from '../../actions';
import AbsenceFilters, { type AbsenceFilterValues } from '@/components/hr/AbsenceFilters';
import YearlyCalendar, { MonthGrid } from '@/components/absences/YearlyCalendar';

export default function AbsencesCalendarPage() {
    return (
        <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'MANAGER']}>
            <CalendarContent />
        </ProtectedRoute>
    );
}

function CalendarContent() {
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [absences, setAbsences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<{ date: string; name: string; type?: string }[]>([]);
    const [selectedDay, setSelectedDay] = useState<{ date: Date; absences: any[] } | null>(null);
    const [selectedAbsenceIds, setSelectedAbsenceIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    // View state
    const [viewMode, setViewMode] = useState<'YEAR' | 'MONTH'>('YEAR');
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

    // Filters state
    const [filters, setFilters] = useState<AbsenceFilterValues>({
        search: '',
        status: '',
        department: '',
        userIds: [],
    });

    const buildCalendarFilters = useCallback(() => {
        const params: any = {};
        if (filters.status) params.status = filters.status;
        if (filters.search) params.search = filters.search;
        if (filters.department) params.department = filters.department;
        if (filters.userIds.length > 0) params.userIds = filters.userIds;
        return Object.keys(params).length > 0 ? params : undefined;
    }, [filters]);

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const emps = await getEmployeesForFilter();
                setEmployees(emps);
            } catch (error) {
                console.error('Error loading employees:', error);
            }
        };
        loadEmployees();
    }, []);

    useEffect(() => {
        const fetchAbsences = async () => {
            setLoading(true);
            try {
                const [data, hols] = await Promise.all([
                    getYearlyAbsences(currentYear, buildCalendarFilters()),
                    getHolidaysForCalendar(currentYear)
                ]);
                setAbsences(data);
                setHolidays(hols);
            } catch (error) {
                console.error('Error fetching absences:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAbsences();
    }, [currentYear, buildCalendarFilters]);

    // Calculate yearly stats
    const stats = {
        total: absences.length,
        pending: absences.filter(a => a.status === 'PENDING').length,
        approved: absences.filter(a => a.status === 'APPROVED').length,
        rejected: absences.filter(a => a.status === 'REJECTED').length,
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            VACATION: 'bg-blue-500', SICK: 'bg-red-500', PERSONAL: 'bg-purple-500',
            MATERNITY: 'bg-pink-500', PATERNITY: 'bg-cyan-500', UNPAID: 'bg-yellow-500', OTHER: 'bg-neutral-500'
        };
        return colors[type] || 'bg-neutral-400';
    };

    const getTypeBg = (type: string) => {
        const colors: Record<string, string> = {
            VACATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            SICK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            PERSONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            MATERNITY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
            PATERNITY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
            UNPAID: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            OTHER: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-400'
        };
        return colors[type] || colors.OTHER;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada',
        };
        return labels[status] || status;
    };

    const getTypeName = (type: string) => {
        const types: Record<string, string> = {
            VACATION: 'Vacaciones', SICK: 'Enfermedad', PERSONAL: 'Personal',
            MATERNITY: 'Maternidad', PATERNITY: 'Paternidad', UNPAID: 'Sin sueldo', OTHER: 'Otro'
        };
        return types[type] || type;
    };

    const handleDayClick = (date: Date) => {
        // Use local date components to avoid timezone shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Filter absences for this specific day
        const dayAbsences = absences.filter(absence => {
            const startStr = new Date(absence.startDate).toISOString().split('T')[0];
            const endStr = new Date(absence.endDate).toISOString().split('T')[0];
            return dateStr >= startStr && dateStr <= endStr;
        });

        if (dayAbsences.length > 0) {
            setSelectedDay({ date, absences: dayAbsences });
        }
    };

    const handleMonthClick = (month: number) => {
        setSelectedMonth(month);
        setViewMode('MONTH');
    };

    const handleBackToYear = () => {
        setViewMode('YEAR');
        setSelectedMonth(null);
    };

    // Filter absences for the selected month list view
    const selectedMonthAbsences = selectedMonth ? absences.filter(absence => {
        const start = new Date(absence.startDate);
        const end = new Date(absence.endDate);
        // Check if absence overlaps with selected month
        // Simple check: start OR end is in month, OR start before and end after
        const monthStart = new Date(currentYear, selectedMonth - 1, 1);
        const monthEnd = new Date(currentYear, selectedMonth, 0);
        return (start <= monthEnd && end >= monthStart);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) : [];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/hr/absences" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                            Calendario de Ausencias
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400">
                            Vista anual de todo el equipo
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                    <div className="p-2 bg-olive-100 dark:bg-olive-900/30 rounded-lg text-olive-600 dark:text-olive-400">
                        <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Total {currentYear}</p>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Pendientes</p>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Aprobadas</p>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">{stats.approved}</p>
                    </div>
                </div>
                {stats.rejected > 0 && (
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <XCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 uppercase">Rechazadas</p>
                            <p className="text-lg font-bold text-neutral-900 dark:text-white">{stats.rejected}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <AbsenceFilters
                filters={filters}
                onChange={setFilters}
                users={employees}
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-2 text-xs">
                {[
                    { type: 'VACATION', label: 'Vacaciones' },
                    { type: 'SICK', label: 'Enfermedad' },
                    { type: 'PERSONAL', label: 'Personal' },
                    { type: 'MATERNITY', label: 'Maternidad' },
                    { type: 'PATERNITY', label: 'Paternidad' },
                    { type: 'UNPAID', label: 'Sin sueldo' },
                ].map(({ type, label }) => (
                    <span key={type} className={`px-2 py-1 rounded-full font-medium ${getTypeBg(type)}`}>
                        {label}
                    </span>
                ))}
                <span className="px-2 py-1 rounded-full bg-white dark:bg-neutral-800 border border-yellow-400 border-dashed text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                    Pendiente
                </span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                    🎉 Festivo
                </span>
            </div>

            {/* Calendar Content */}
            <AnimatePresence mode="wait">
                {viewMode === 'YEAR' ? (
                    <motion.div
                        key="year-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-96 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto mb-2"></div>
                                    <p className="text-neutral-500 text-sm">Cargando calendario...</p>
                                </div>
                            </div>
                        ) : (
                            <YearlyCalendar
                                year={currentYear}
                                absences={absences}
                                holidays={holidays}
                                onMonthClick={handleMonthClick}
                                onDayClick={handleDayClick}
                                onYearChange={setCurrentYear}
                            />
                        )}
                    </motion.div>
                ) : selectedMonth ? (
                    <motion.div
                        key="month-view"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden p-6">
                            <div className="flex items-center mb-6">
                                <button
                                    onClick={handleBackToYear}
                                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="font-medium">Volver al año</span>
                                </button>
                            </div>
                            <MonthGrid
                                year={currentYear}
                                month={selectedMonth}
                                name={new Date(currentYear, selectedMonth - 1).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                                absences={absences}
                                holidays={holidays}
                                onDayClick={handleDayClick}
                                variant="large"
                            />
                        </div>

                        {/* List of absences for selected month */}
                        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                                <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <List className="w-4 h-4 text-olive-600" />
                                    Ausencias en {new Date(currentYear, selectedMonth - 1).toLocaleString('es-ES', { month: 'long' })}
                                </h3>
                            </div>
                            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {selectedMonthAbsences.length === 0 ? (
                                    <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                                        No hay ausencias registradas en este mes
                                    </div>
                                ) : (
                                    selectedMonthAbsences.map(absence => (
                                        <div key={absence.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors flex items-center gap-4">
                                            {absence.user?.image ? (
                                                <img src={absence.user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-600 flex items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-500">
                                                    {absence.user?.name?.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-neutral-900 dark:text-white">
                                                            {absence.user?.name}
                                                        </h4>
                                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                            {absence.user?.department || 'Sin departamento'}
                                                        </p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getTypeBg(absence.type)}`}>
                                                        {getTypeName(absence.type)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">
                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                        <span>
                                                            {new Date(absence.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {new Date(absence.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    {absence.status !== 'APPROVED' ? (
                                                        <span className="text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1 text-xs">
                                                            <Clock className="w-3 h-3" />
                                                            {getStatusLabel(absence.status)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 text-xs">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Aprobada
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* Day Details Modal */}
            <AnimatePresence>
                {selectedDay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => { setSelectedDay(null); setSelectedAbsenceIds(new Set()); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden max-h-[80vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-olive-600 dark:text-olive-400 font-bold text-lg">
                                            {selectedDay.date.getDate()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-neutral-900 dark:text-white text-lg capitalize">
                                                {selectedDay.date.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', year: 'numeric' })}
                                            </h3>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                {selectedDay.absences.length} ausencia{selectedDay.absences.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedDay(null); setSelectedAbsenceIds(new Set()); }}
                                        className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
                                    >
                                        <XCircle className="w-6 h-6 text-neutral-400" />
                                    </button>
                                </div>

                                {/* Toolbar: Select All + Bulk Delete */}
                                {selectedDay.absences.length > 0 && (
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedDay.absences.length > 0 && selectedAbsenceIds.size === selectedDay.absences.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAbsenceIds(new Set(selectedDay.absences.map((a: any) => a.id)));
                                                    } else {
                                                        setSelectedAbsenceIds(new Set());
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-neutral-300 text-olive-600 focus:ring-olive-500"
                                            />
                                            <span className="font-medium">Seleccionar todas</span>
                                        </label>

                                        {selectedAbsenceIds.size > 0 && (
                                            <button
                                                disabled={deleting}
                                                onClick={async () => {
                                                    const count = selectedAbsenceIds.size;
                                                    if (!confirm(`¿Eliminar ${count} ausencia${count !== 1 ? 's' : ''} seleccionada${count !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
                                                    setDeleting(true);
                                                    try {
                                                        await deleteAbsences(Array.from(selectedAbsenceIds));
                                                        const data = await getYearlyAbsences(currentYear, buildCalendarFilters());
                                                        setAbsences(data);
                                                        const remaining = selectedDay.absences.filter((a: any) => !selectedAbsenceIds.has(a.id));
                                                        if (remaining.length === 0) {
                                                            setSelectedDay(null);
                                                        } else {
                                                            setSelectedDay({ ...selectedDay, absences: remaining });
                                                        }
                                                        setSelectedAbsenceIds(new Set());
                                                    } catch (err: any) {
                                                        alert(err.message || 'Error al eliminar');
                                                    } finally {
                                                        setDeleting(false);
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Eliminar {selectedAbsenceIds.size} seleccionada{selectedAbsenceIds.size !== 1 ? 's' : ''}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Absences List */}
                            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3">
                                {selectedDay.absences.map((absence: any) => {
                                    const start = new Date(absence.startDate);
                                    const end = new Date(absence.endDate);
                                    const isSingleDay = start.getTime() === end.getTime();
                                    const dateText = isSingleDay
                                        ? start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
                                        : `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                                    const isSelected = selectedAbsenceIds.has(absence.id);

                                    return (
                                        <div
                                            key={absence.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isSelected
                                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                                    : 'bg-neutral-50 dark:bg-neutral-700/30 border-neutral-100 dark:border-neutral-700 hover:border-olive-200 dark:hover:border-olive-700'
                                                }`}
                                        >
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    const next = new Set(selectedAbsenceIds);
                                                    if (e.target.checked) {
                                                        next.add(absence.id);
                                                    } else {
                                                        next.delete(absence.id);
                                                    }
                                                    setSelectedAbsenceIds(next);
                                                }}
                                                className="w-4 h-4 rounded border-neutral-300 text-olive-600 focus:ring-olive-500 shrink-0"
                                            />

                                            {/* Avatar */}
                                            {absence.user?.image ? (
                                                <img src={absence.user.image} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-neutral-600 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-600 flex items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-300 border-2 border-neutral-100 dark:border-neutral-500 shrink-0">
                                                    {absence.user?.name?.charAt(0)}
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-bold text-neutral-900 dark:text-white truncate text-sm">
                                                        {absence.user?.name}
                                                    </h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${getTypeBg(absence.type)}`}>
                                                        {getTypeName(absence.type)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                                    <span>{dateText}</span>
                                                    <span>•</span>
                                                    {absence.status !== 'APPROVED' ? (
                                                        <span className="text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {getStatusLabel(absence.status)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Aprobada
                                                        </span>
                                                    )}
                                                </div>
                                                {absence.reason && (
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1 italic">
                                                        "{absence.reason}"
                                                    </p>
                                                )}
                                            </div>

                                            {/* Individual Delete */}
                                            <button
                                                disabled={deleting}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm(`¿Eliminar ausencia de ${absence.user?.name}? Esta acción no se puede deshacer.`)) return;
                                                    setDeleting(true);
                                                    try {
                                                        await deleteAbsence(absence.id);
                                                        const data = await getYearlyAbsences(currentYear, buildCalendarFilters());
                                                        setAbsences(data);
                                                        const remaining = selectedDay.absences.filter((a: any) => a.id !== absence.id);
                                                        if (remaining.length === 0) {
                                                            setSelectedDay(null);
                                                        } else {
                                                            setSelectedDay({ ...selectedDay, absences: remaining });
                                                        }
                                                        // Remove from selection if it was selected
                                                        const next = new Set(selectedAbsenceIds);
                                                        next.delete(absence.id);
                                                        setSelectedAbsenceIds(next);
                                                    } catch (err: any) {
                                                        alert(err.message || 'Error al eliminar');
                                                    } finally {
                                                        setDeleting(false);
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0 disabled:opacity-50"
                                                title="Eliminar esta ausencia"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

