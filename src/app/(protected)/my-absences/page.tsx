'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CalendarDays, Plus, XCircle, ChevronLeft, List, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getMyAbsences, requestAbsence, getVacationBalance, cancelMyAbsence, getHolidaysForCalendar } from '../hr/actions';
import { useToast } from '@/components/ui/Toast';
import YearlyCalendar, { MonthGrid } from '@/components/absences/YearlyCalendar';

export default function MyAbsencesPage() {
    return (
        <ProtectedRoute>
            <MyAbsencesContent />
        </ProtectedRoute>
    );
}

function MyAbsencesContent() {
    const [absences, setAbsences] = useState<any[]>([]);
    const [balances, setBalances] = useState<{
        vacation: { total: number; used: number; pending: number; available: number };
        personal: { total: number; used: number; pending: number; available: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'LIST' | 'YEAR' | 'MONTH'>('YEAR');
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [showNewRequest, setShowNewRequest] = useState(false);
    const [holidays, setHolidays] = useState<{ date: string; name: string; type?: string }[]>([]);

    // Request form state
    const [newRequest, setNewRequest] = useState({
        type: 'VACATION' as const,
        startDate: '',
        endDate: '',
        reason: ''
    });

    const toast = useToast();

    const fetchData = async () => {
        try {
            const [myAbsences, myBalances, myHolidays] = await Promise.all([
                getMyAbsences(),
                getVacationBalance(),
                getHolidaysForCalendar(currentYear)
            ]);
            setAbsences(myAbsences);
            setBalances(myBalances as any);
            setHolidays(myHolidays);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const start = new Date(newRequest.startDate);
        const end = new Date(newRequest.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            toast.error('La fecha de inicio no puede ser anterior a hoy');
            return;
        }
        if (end < start) {
            toast.error('La fecha de fin no puede ser anterior a la de inicio');
            return;
        }

        try {
            await requestAbsence({
                type: newRequest.type,
                startDate: start,
                endDate: end,
                reason: newRequest.reason
            });
            setShowNewRequest(false);
            setNewRequest({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
            toast.success('Solicitud enviada correctamente');
            await fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Error al solicitar');
        }
    };

    const handleCancel = async (absenceId: string) => {
        if (!confirm('¿Estás seguro de que quieres cancelar esta solicitud?')) return;
        try {
            await cancelMyAbsence(absenceId);
            toast.success('Solicitud cancelada');
            await fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Error al cancelar');
        }
    };

    const handleDayClick = (date: Date) => {
        // Use local date components to avoid timezone shifts (e.g. UTC-1 issue)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setNewRequest(prev => ({
            ...prev,
            startDate: dateStr,
            endDate: dateStr
        }));
        setShowNewRequest(true);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            CANCELLED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-400'
        };
        const labels: Record<string, string> = {
            PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada'
        };
        return <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>{labels[status]}</span>;
    };

    const getTypeName = (type: string) => {
        const types: Record<string, string> = {
            VACATION: 'Vacaciones', SICK: 'Enfermedad', PERSONAL: 'Asuntos Personales',
            MATERNITY: 'Maternidad', PATERNITY: 'Paternidad', UNPAID: 'Sin sueldo', OTHER: 'Otro'
        };
        return types[type] || type;
    };

    const handleMonthClick = (month: number) => {
        setSelectedMonth(month);
        setViewMode('MONTH');
    };

    const handleBackToYear = () => {
        setViewMode('YEAR');
        setSelectedMonth(null);
    };

    // ... render methods ...

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Mis Ausencias</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">Gestiona tus vacaciones y permisos</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 flex">
                        <button
                            onClick={() => setViewMode('YEAR')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'YEAR' || viewMode === 'MONTH' ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-400' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                            title="Vista Calendario"
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-400' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                            title="Vista Lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowNewRequest(true)}
                        className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Solicitar
                    </button>
                </div>
            </div>

            {/* Content View */}
            <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {viewMode === 'YEAR' ? (
                    <YearlyCalendar
                        year={currentYear}
                        absences={absences}
                        holidays={holidays}
                        onMonthClick={handleMonthClick}
                        onDayClick={handleDayClick}
                        onYearChange={(y) => { setCurrentYear(y); getHolidaysForCalendar(y).then(setHolidays).catch(() => { }); }}
                    />
                ) : viewMode === 'MONTH' && selectedMonth ? (
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
                ) : (
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                        {absences.length === 0 ? (
                            <div className="text-center py-20">
                                <CalendarDays className="w-16 h-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                                <p className="text-neutral-500 font-medium">No tienes solicitudes registradas</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {absences.map((absence) => {
                                    const start = new Date(absence.startDate);
                                    const end = new Date(absence.endDate);
                                    const isSingleDay = start.getTime() === end.getTime();

                                    // Format dates
                                    const dateText = isSingleDay
                                        ? start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

                                    return (
                                        <div key={absence.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors flex items-center justify-between group">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center justify-center w-14 h-14 bg-neutral-100 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600">
                                                    <span className="text-xs text-neutral-500 uppercase font-bold">{start.toLocaleDateString('es-ES', { month: 'short' })}</span>
                                                    <span className="text-lg font-bold text-neutral-900 dark:text-white">{start.getDate()}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                                        {getTypeName(absence.type)}
                                                        {getStatusBadge(absence.status)}
                                                    </h4>
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                        {dateText}
                                                        {' • '}{absence.totalDays} {absence.totalDays === 1 ? 'día' : 'días'}
                                                    </p>
                                                    {absence.reason && (
                                                        <p className="text-xs text-neutral-400 mt-1 italic line-clamp-1">"{absence.reason}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            {absence.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleCancel(absence.id)}
                                                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Cancelar solicitud"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Balances Cards */}
            {balances && viewMode !== 'MONTH' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vacation Balance */}
                    <div className="bg-gradient-to-br from-olive-600 to-olive-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CalendarDays className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold mb-1 opacity-90">Vacaciones {currentYear}</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-4xl font-bold">{balances.vacation.available}</span>
                                <span className="text-sm opacity-75">días disponibles</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                <div>
                                    <div className="text-xs opacity-75 uppercase tracking-wide">Total</div>
                                    <div className="font-bold text-lg">{balances.vacation.total}</div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-75 uppercase tracking-wide">Usados</div>
                                    <div className="font-bold text-lg">{balances.vacation.used}</div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-75 uppercase tracking-wide">Pendientes</div>
                                    <div className="font-bold text-lg">{balances.vacation.pending}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Days Balance */}
                    <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calendar className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold mb-1 opacity-90">Asuntos Propios {currentYear}</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-4xl font-bold">{balances.personal.available}</span>
                                <span className="text-sm opacity-75">días disponibles</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                <div>
                                    <div className="text-xs opacity-75 uppercase tracking-wide">Total</div>
                                    <div className="font-bold text-lg">{balances.personal.total}</div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-75 uppercase tracking-wide">Usados</div>
                                    <div className="font-bold text-lg">{balances.personal.used}</div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-75 uppercase tracking-wide">Pendientes</div>
                                    <div className="font-bold text-lg">{balances.personal.pending}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {showNewRequest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-700"
                    >
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                            <Plus className="w-6 h-6 text-olive-600" />
                            Nueva Solicitud
                        </h2>
                        <form onSubmit={handleSubmitRequest} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    Tipo de Ausencia
                                </label>
                                <select
                                    value={newRequest.type}
                                    onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value as any })}
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                    required
                                >
                                    <option value="VACATION">Vacaciones</option>
                                    <option value="SICK">Enfermedad</option>
                                    <option value="PERSONAL">Asuntos Personales</option>
                                    <option value="MATERNITY">Maternidad</option>
                                    <option value="PATERNITY">Paternidad</option>
                                    <option value="UNPAID">Sin sueldo</option>
                                    <option value="OTHER">Otro</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={newRequest.startDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        Hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={newRequest.endDate}
                                        min={newRequest.startDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Summary Calculation */}
                            {newRequest.startDate && newRequest.endDate && (
                                <div className="bg-olive-50 dark:bg-olive-900/20 p-3 rounded-lg border border-olive-100 dark:border-olive-800/50 flex items-center justify-between text-sm">
                                    <span className="text-olive-700 dark:text-olive-400 font-medium">Duración estimada:</span>
                                    <span className="font-bold text-olive-800 dark:text-olive-300">
                                        {Math.max(0, Math.ceil((new Date(newRequest.endDate).getTime() - new Date(newRequest.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} días
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    Motivo <span className="text-neutral-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none resize-none transition-all"
                                    rows={3}
                                    placeholder="Explica el motivo..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewRequest(false)}
                                    className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-olive-600 text-white rounded-xl hover:bg-olive-700 font-medium transition-colors shadow-lg shadow-olive-600/20"
                                >
                                    Confirmar Solicitud
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
