'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, XCircle, ChevronLeft, List, Calendar, AlertTriangle, Upload, Info, CheckCircle, ArrowLeftRight, Bell } from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    getMyAbsences, requestAbsence, getVacationBalance,
    cancelMyAbsence, getHolidaysForCalendar, getMyFutureAbsences, requestAbsenceSwap
} from '../hr/actions';
import { getUnreadNotificationsForRoute, markNotificationsAsReadForRoute } from '../notifications/actions';
import { useToast } from '@/components/ui/Toast';
import YearlyCalendar, { MonthGrid } from '@/components/absences/YearlyCalendar';
import {
    ABSENCE_LIMITS, countWorkingDays
} from '@/lib/absence-rules-engine';

export default function MyAbsencesPage() {
    return (
        <ProtectedRoute>
            <MyAbsencesContent />
        </ProtectedRoute>
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Balance {
    vacation: { total: number; used: number; pending: number; available: number };
    personal: { total: number; used: number; pending: number; available: number };
    looseVacationDaysUsed: number;
    looseVacationDaysWithoutNotice: number;
    childSicknessHoursBank: number;
    vacationModifications: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function MyAbsencesContent() {
    const [absences, setAbsences] = useState<any[]>([]);
    const [balance, setBalance] = useState<Balance | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'LIST' | 'YEAR' | 'MONTH'>('YEAR');
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [holidays, setHolidays] = useState<{ date: string; name: string; type?: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [pageNotifications, setPageNotifications] = useState<any[]>([]);

    // Swap flow
    const [swapStep, setSwapStep] = useState(false); // true = showing future absence picker
    const [futureAbsences, setFutureAbsences] = useState<any[]>([]);
    const [loadingFuture, setLoadingFuture] = useState(false);
    const [selectedSwapIds, setSelectedSwapIds] = useState<string[]>([]);

    const [form, setForm] = useState({
        type: 'VACATION',
        startDate: '',
        endDate: '',
        reason: '',
        hours: '',
        startTime: '',
        endTime: '',
        isLateNotice: false,
        attachmentUrl: '',
    });

    const toast = useToast();

    // ── fetch data ──────────────────────────────────────────────────────────

    const fetchData = async () => {
        try {
            const [myAbsences, myBalance, myHolidays, unreadNotifs] = await Promise.all([
                getMyAbsences(),
                getVacationBalance(),
                getHolidaysForCalendar(currentYear),
                getUnreadNotificationsForRoute('/my-absences'),
            ]);
            setAbsences(myAbsences);
            setBalance(myBalance as Balance);
            setHolidays(myHolidays);
            if (unreadNotifs.length > 0) {
                setPageNotifications(unreadNotifs);
                // Clear sidebar badge in background
                markNotificationsAsReadForRoute('/my-absences').catch(() => {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ── realtime validation ─────────────────────────────────────────────────

    const validationWarnings = useMemo((): string[] => {
        if (!form.startDate || !balance) return [];
        const end_date = form.endDate || form.startDate;
        const start = new Date(form.startDate);
        const end = new Date(end_date);
        if (start > end) return [];

        const holidayObjs = holidays.map(h => ({ date: h.date }));
        const wdays = countWorkingDays(start, end, holidayObjs);
        const warns: string[] = [];

        // Check for overlap with existing non-cancelled/rejected absences
        const overlaps = absences.some(a => {
            if (a.status === 'REJECTED' || a.status === 'CANCELLED') return false;
            const aStart = new Date(a.startDate).toISOString().split('T')[0];
            const aEnd = new Date(a.endDate).toISOString().split('T')[0];
            return form.startDate <= aEnd && end_date >= aStart;
        });
        if (overlaps) {
            warns.push('Ya tienes una ausencia pendiente o aprobada en este período. Edita la solicitud existente si quieres cambiar las fechas.');
        }

        if (form.type === 'VACATION') {
            if (wdays > ABSENCE_LIMITS.CONSECUTIVE_DAYS_MAX) {
                warns.push(`Vacaciones exceden ${ABSENCE_LIMITS.CONSECUTIVE_WEEKS_MAX} semanas consecutivas (${wdays}/${ABSENCE_LIMITS.CONSECUTIVE_DAYS_MAX} días laborables).`);
            }
            const remaining = balance.vacation.total - (balance.vacation.used + balance.vacation.pending);
            if (wdays > remaining) {
                warns.push(`Saldo insuficiente: ${wdays} días solicitados, ${remaining} disponibles.`);
            }
        }

        if (form.type === 'PERSONAL') {
            const usedPersonal = balance.personal.used + balance.personal.pending;
            if (wdays > balance.personal.total - usedPersonal) {
                warns.push(`Saldo de asuntos propios insuficiente.`);
            }
        }

        return warns;
    }, [form.type, form.startDate, form.endDate, balance, holidays, absences]);

    // True when start and end are the same date (enables time range UI)
    const isSingleDay = form.startDate !== '' && (form.startDate === form.endDate || !form.endDate);

    // Whether the only blocking issue is insufficient balance (swap is possible)
    const hasOnlyBalanceWarning = useMemo(() =>
        validationWarnings.length > 0 &&
        validationWarnings.every(w => w.includes('Saldo insuficiente') || w.includes('asuntos propios insuficiente')),
        [validationWarnings]
    );

    // Working days preview
    const workingDaysPreview = useMemo(() => {
        if (!form.startDate) return null;
        const start = new Date(form.startDate);
        const end = new Date(form.endDate || form.startDate);
        if (start > end) return null;
        return countWorkingDays(start, end, holidays.map(h => ({ date: h.date })));
    }, [form.startDate, form.endDate, holidays]);

    // ── document upload ─────────────────────────────────────────────────────

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('El archivo no puede superar 10 MB');
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload/document', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Error al subir el archivo');
            const { url } = await res.json();
            setForm(prev => ({ ...prev, attachmentUrl: url }));
            toast.success('Documento adjuntado');
        } catch {
            toast.error('No se pudo subir el documento');
        } finally {
            setUploading(false);
        }
    };

    // ── submit ──────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const start = new Date(form.startDate);
        const end = new Date(form.endDate || form.startDate);
        const today = new Date(); today.setHours(0, 0, 0, 0);

        if (start < today) { toast.error('La fecha de inicio no puede ser anterior a hoy'); return; }
        if (end < start)   { toast.error('La fecha de fin no puede ser anterior a la de inicio'); return; }

        setSubmitting(true);
        try {
            const result = await requestAbsence({
                type: form.type as any,
                startDate: start,
                endDate: end,
                reason: form.reason || undefined,
                hours: form.hours ? parseFloat(form.hours) : undefined,
                startTime: form.startTime || undefined,
                endTime: form.endTime || undefined,
                isLateNotice: form.isLateNotice,
                attachmentUrl: form.attachmentUrl || undefined,
            });

            setShowModal(false);
            resetForm();
            toast.success('Solicitud enviada');

            // Show any server-side warnings
            if ((result as any).warnings?.length) {
                (result as any).warnings.forEach((w: string) => toast.error(w));
            }

            await fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Error al solicitar');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({ type: 'VACATION', startDate: '', endDate: '', reason: '', hours: '', startTime: '', endTime: '', isLateNotice: false, attachmentUrl: '' });
        setSwapStep(false);
        setSelectedSwapIds([]);
        setFutureAbsences([]);
    };

    const openSwapPicker = async () => {
        setLoadingFuture(true);
        setSwapStep(true);
        try {
            const futures = await getMyFutureAbsences();
            setFutureAbsences(futures);
        } catch (err: any) {
            toast.error(err.message || 'Error al cargar ausencias futuras');
            setSwapStep(false);
        } finally {
            setLoadingFuture(false);
        }
    };

    const handleSwapSubmit = async () => {
        if (submitting) return;
        if (selectedSwapIds.length === 0) {
            toast.error('Selecciona al menos una ausencia para intercambiar');
            return;
        }
        setSubmitting(true);
        try {
            await requestAbsenceSwap({
                type: form.type as 'VACATION' | 'PERSONAL',
                newStartDate: new Date(form.startDate),
                newEndDate: new Date(form.endDate),
                reason: form.reason || undefined,
                attachmentUrl: form.attachmentUrl || undefined,
                swapAbsenceIds: selectedSwapIds,
            });
            setShowModal(false);
            resetForm();
            toast.success('Solicitud de cambio enviada — RRHH la revisará');
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Error al solicitar el cambio');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (cancellingId) return;
        if (!confirm('¿Cancelar esta solicitud?')) return;
        setCancellingId(id);
        try {
            await cancelMyAbsence(id);
            toast.success('Solicitud cancelada');
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Error al cancelar');
        } finally {
            setCancellingId(null);
        }
    };

    const handleDayClick = (date: Date) => {
        const dateStr = toLocalDateStr(date);
        setForm(prev => ({ ...prev, startDate: dateStr, endDate: dateStr }));
        setShowModal(true);
    };

    // ── labels ──────────────────────────────────────────────────────────────

    const statusBadge = (s: string) => {
        const styles: Record<string, string> = {
            PENDING:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            APPROVED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            REJECTED:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            CANCELLED: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
        };
        const labels: Record<string, string> = {
            PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada',
        };
        return <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[s] ?? ''}`}>{labels[s] ?? s}</span>;
    };

    const typeName = (t: string) => ({
        VACATION: 'Vacaciones', SICK: 'Baja Enfermedad', PERSONAL: 'Asuntos Propios',
        MATERNITY: 'Maternidad', PATERNITY: 'Paternidad',
        MARRIAGE: 'Matrimonio (15 días)', BEREAVEMENT_1ST_DEGREE: 'Fallec. Cónyuge/Hijo',
        BEREAVEMENT_2ND_DEGREE: 'Fallec. 2º Grado', PUBLIC_DUTY: 'Deber Público',
        CHILD_SICKNESS: 'Enf. Hijos Menores', UNPAID_MONTH: 'Permiso sin Sueldo (1 mes)',
        UNPAID: 'Sin sueldo', OTHER: 'Otro',
    }[t] ?? t);

    // ── render ──────────────────────────────────────────────────────────────

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
                        <button onClick={() => setViewMode('YEAR')}
                            className={`p-2 rounded-md transition-colors ${viewMode !== 'LIST' ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-400' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                            <Calendar className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-400' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors flex items-center gap-2 font-medium shadow-sm">
                        <Plus className="w-4 h-4" /> Solicitar
                    </button>
                </div>
            </div>

            {/* Pending notifications banner */}
            {pageNotifications.length > 0 && (
                <div className="space-y-2">
                    {pageNotifications.map((n) => (
                        <div key={n.id} className="flex items-start gap-3 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800 rounded-xl px-4 py-3">
                            <Bell className="w-4 h-4 text-olive-600 dark:text-olive-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-olive-900 dark:text-olive-200">{n.title}</p>
                                <p className="text-xs text-olive-700 dark:text-olive-400 mt-0.5">{n.message}</p>
                            </div>
                            <button
                                onClick={() => setPageNotifications(prev => prev.filter(x => x.id !== n.id))}
                                className="text-olive-500 hover:text-olive-700 dark:text-olive-500 dark:hover:text-olive-300 flex-shrink-0"
                                aria-label="Cerrar"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Calendar / List view */}
            <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {viewMode === 'YEAR' ? (
                    <YearlyCalendar year={currentYear} absences={absences} holidays={holidays}
                        onMonthClick={(m) => { setSelectedMonth(m); setViewMode('MONTH'); }}
                        onDayClick={handleDayClick}
                        onYearChange={(y) => {
                            setCurrentYear(y);
                            getHolidaysForCalendar(y).then(setHolidays).catch(() => { });
                        }} />
                ) : viewMode === 'MONTH' && selectedMonth ? (
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden p-6">
                        <button onClick={() => { setViewMode('YEAR'); setSelectedMonth(null); }}
                            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-6 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                            <span className="font-medium">Volver al año</span>
                        </button>
                        <MonthGrid year={currentYear} month={selectedMonth}
                            name={new Date(currentYear, selectedMonth - 1).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                            absences={absences} holidays={holidays} onDayClick={handleDayClick} variant="large" />
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
                                {absences.map((a) => {
                                    const start = new Date(a.startDate);
                                    const end = new Date(a.endDate);
                                    const single = start.getTime() === end.getTime();
                                    const dateText = single
                                        ? start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                                    return (
                                        <div key={a.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 flex items-center justify-between group transition-colors">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center justify-center w-14 h-14 bg-neutral-100 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600">
                                                    <span className="text-xs text-neutral-500 uppercase font-bold">{start.toLocaleDateString('es-ES', { month: 'short' })}</span>
                                                    <span className="text-lg font-bold text-neutral-900 dark:text-white">{start.getDate()}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                                        {typeName(a.type)} {statusBadge(a.status)}
                                                    </h4>
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                        {dateText} · {a.totalDays} {a.totalDays === 1 ? 'día' : 'días'}
                                                        {a.startTime && a.endTime && <span className="ml-1">· {a.startTime}–{a.endTime}</span>}
                                                    </p>
                                                    {a.reason && <p className="text-xs text-neutral-400 mt-1 italic line-clamp-1">"{a.reason}"</p>}
                                                    {a.attachmentUrl && (
                                                        <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                                                            className="text-xs text-olive-600 hover:underline mt-1 flex items-center gap-1">
                                                            <Upload className="w-3 h-3" /> Documento adjunto
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            {a.status === 'PENDING' && (
                                                <button onClick={() => handleCancel(a.id)}
                                                    disabled={cancellingId === a.id}
                                                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed">
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

            {/* Balance Cards — below the calendar */}
            {balance && viewMode !== 'MONTH' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-olive-600 to-olive-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CalendarDays className="w-20 h-20" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-base font-semibold mb-1 opacity-90">Vacaciones {currentYear}</h3>
                            <div className="flex items-baseline gap-1 mb-3">
                                <span className="text-3xl font-bold">{balance.vacation.available}</span>
                                <span className="text-xs opacity-75">días disponibles</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                                {[
                                    { label: 'Total', value: balance.vacation.total },
                                    { label: 'Usados', value: balance.vacation.used },
                                    { label: 'Pendientes', value: balance.vacation.pending },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <div className="text-[10px] opacity-75 uppercase tracking-wide">{label}</div>
                                        <div className="font-bold">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10"><Calendar className="w-14 h-14" /></div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-semibold mb-1 opacity-90">Asuntos Propios</h3>
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-2xl font-bold">{balance.personal.available}</span>
                                <span className="text-xs opacity-75">/ {balance.personal.total}</span>
                            </div>
                            <div className="text-xs opacity-75">Usados: {balance.personal.used} · Pend.: {balance.personal.pending}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-700 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                            <Plus className="w-6 h-6 text-olive-600" /> Nueva Solicitud
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Tipo de Ausencia</label>
                                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, hours: '', isLateNotice: false })}
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none" required>
                                    <option value="VACATION">Vacaciones</option>
                                    <option value="PERSONAL">Asuntos Propios (máx. {balance?.personal.total ?? 2} días/año)</option>
                                    <option value="OTHER">Otros</option>
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Desde</label>
                                    <input type="date" min={toLocalDateStr(new Date())} value={form.startDate}
                                        onChange={e => {
                                            const newStart = e.target.value;
                                            setForm(prev => ({
                                                ...prev,
                                                startDate: newStart,
                                                endDate: (!prev.endDate || prev.endDate < newStart) ? newStart : prev.endDate,
                                            }));
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Hasta <span className="font-normal text-neutral-400">(opcional)</span>
                                    </label>
                                    <input type="date" min={form.startDate || toLocalDateStr(new Date())} value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none" />
                                </div>
                            </div>

                            {/* Optional time range — only for single-day requests */}
                            {isSingleDay && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-neutral-400" />
                                        Franja horaria <span className="font-normal text-neutral-400">(opcional — para ausencias parciales)</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1">Desde</label>
                                            <input type="time" value={form.startTime}
                                                onChange={e => setForm({ ...form, startTime: e.target.value })}
                                                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1">Hasta</label>
                                            <input type="time" value={form.endTime}
                                                onChange={e => setForm({ ...form, endTime: e.target.value })}
                                                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-olive-500 outline-none text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Working days preview */}
                            {workingDaysPreview !== null && (
                                <div className="flex items-center justify-between bg-olive-50 dark:bg-olive-900/20 border border-olive-100 dark:border-olive-800/50 rounded-lg px-3 py-2 text-sm">
                                    <span className="text-olive-700 dark:text-olive-400 font-medium flex items-center gap-1.5">
                                        <Info className="w-4 h-4" /> {form.startTime && form.endTime ? 'Franja:' : 'Días laborables:'}
                                    </span>
                                    <span className="font-bold text-olive-800 dark:text-olive-300">
                                        {form.startTime && form.endTime ? `${form.startTime} – ${form.endTime}` : workingDaysPreview}
                                    </span>
                                </div>
                            )}

                            {/* Realtime validation warnings */}
                            {validationWarnings.length > 0 && (
                                <div className="space-y-1.5">
                                    {validationWarnings.map((w, i) => (
                                        <div key={i} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                            {w}
                                        </div>
                                    ))}
                                    {/* Swap option when only balance is the issue */}
                                    {hasOnlyBalanceWarning && (
                                        <button type="button" onClick={openSwapPicker}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                                            <ArrowLeftRight className="w-4 h-4" />
                                            Solicitar como cambio de días (intercambiar con existentes)
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Document upload */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Justificante / documento <span className="text-neutral-400 font-normal">(opcional, máx. 10 MB)</span>
                                </label>
                                {form.attachmentUrl ? (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                        <span className="flex-1 truncate">Documento adjunto</span>
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, attachmentUrl: '' }))}
                                            className="text-neutral-400 hover:text-red-600 transition-colors"><XCircle className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-olive-400 transition-colors">
                                        <Upload className="w-5 h-5 text-neutral-400" />
                                        <span className="text-sm text-neutral-500">{uploading ? 'Subiendo…' : 'Adjuntar archivo (PDF, imagen)'}</span>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Motivo <span className="text-neutral-400 font-normal">(opcional)</span>
                                </label>
                                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-olive-500 outline-none resize-none"
                                    rows={2} placeholder="Explica el motivo…" />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    disabled={submitting || uploading || (validationWarnings.length > 0 && !hasOnlyBalanceWarning)}
                                    className="flex-1 px-4 py-3 bg-olive-600 text-white rounded-xl hover:bg-olive-700 font-medium transition-colors shadow-lg shadow-olive-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {submitting ? 'Enviando…' : 'Confirmar Solicitud'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Swap Picker Modal */}
            {swapStep && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-700 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                    <ArrowLeftRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-900 dark:text-white">Cambio de días</h3>
                                    <p className="text-xs text-neutral-500">Elige qué ausencias quieres cancelar a cambio de los nuevos días</p>
                                </div>
                            </div>
                            <button onClick={() => setSwapStep(false)}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                                <XCircle className="w-4 h-4 text-neutral-400" />
                            </button>
                        </div>

                        {/* Summary of new request */}
                        <div className="mb-4 p-3 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800 rounded-xl text-sm text-olive-800 dark:text-olive-300">
                            <span className="font-medium">Nueva solicitud:</span> {typeName(form.type)} · {form.startDate} → {form.endDate}
                            {workingDaysPreview !== null && <span className="ml-1">({workingDaysPreview} días lab.)</span>}
                        </div>

                        {/* Future absences list */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                            {loadingFuture ? (
                                <div className="flex items-center justify-center py-10">
                                    <span className="w-6 h-6 border-2 border-olive-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : futureAbsences.length === 0 ? (
                                <div className="text-center py-10 text-neutral-400">
                                    <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No tienes ausencias futuras que puedas intercambiar</p>
                                </div>
                            ) : (
                                futureAbsences.map(a => {
                                    const checked = selectedSwapIds.includes(a.id);
                                    const start = new Date(a.startDate);
                                    const end = new Date(a.endDate);
                                    return (
                                        <label key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'}`}>
                                            <input type="checkbox" checked={checked}
                                                onChange={() => setSelectedSwapIds(prev =>
                                                    checked ? prev.filter(id => id !== a.id) : [...prev, a.id]
                                                )}
                                                className="w-4 h-4 accent-amber-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-neutral-900 dark:text-white">{typeName(a.type)}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${a.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                        {a.status === 'APPROVED' ? 'Aprobada' : 'Pendiente'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-0.5">
                                                    {start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} → {end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {a.totalDays} días
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        {selectedSwapIds.length > 0 && (
                            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 text-center">
                                {selectedSwapIds.length} ausencia{selectedSwapIds.length > 1 ? 's' : ''} seleccionada{selectedSwapIds.length > 1 ? 's' : ''} para cancelar si se aprueba el cambio
                            </p>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setSwapStep(false)}
                                className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 font-medium transition-colors">
                                Volver
                            </button>
                            <button onClick={handleSwapSubmit}
                                disabled={submitting || selectedSwapIds.length === 0}
                                className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {submitting ? 'Enviando…' : 'Solicitar cambio'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
