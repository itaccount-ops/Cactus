'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays, CheckCircle, XCircle, Clock, AlertTriangle,
    ChevronLeft, Calendar, UserMinus, TrendingUp, X, Send
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getAllAbsences, processAbsenceRequest, getEmployeesForFilter, getAbsenceStats } from '../actions';
import { useToast } from '@/components/ui/Toast';
import AbsenceFilters, { type AbsenceFilterValues } from '@/components/hr/AbsenceFilters';

export default function AbsencesManagementPage() {
    return (
        <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'MANAGER']}>
            <AbsencesManagementContent />
        </ProtectedRoute>
    );
}

type StatusTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

function AbsencesManagementContent() {
    const [absences, setAbsences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<StatusTab>('PENDING');
    const toast = useToast();

    // Rejection modal state
    const [rejectModal, setRejectModal] = useState<{ open: boolean; absenceId: string; userName: string }>({
        open: false, absenceId: '', userName: ''
    });
    const [rejectNote, setRejectNote] = useState('');

    // Edit modal state
    const [editModal, setEditModal] = useState<{ open: boolean; absence: any }>({
        open: false, absence: null
    });
    const [editForm, setEditForm] = useState({
        startDate: '',
        endDate: '',
        type: '',
        reason: ''
    });

    const [processing, setProcessing] = useState<string | null>(null);

    // ... (existing code) ...

    const handleEdit = (absence: any) => {
        setEditModal({ open: true, absence });
        setEditForm({
            startDate: new Date(absence.startDate).toISOString().split('T')[0],
            endDate: new Date(absence.endDate).toISOString().split('T')[0],
            type: absence.type,
            reason: absence.reason || ''
        });
    };

    const submitEdit = async () => {
        if (!editForm.startDate || !editForm.endDate) {
            toast.error('Las fechas son obligatorias');
            return;
        }
        setProcessing(editModal.absence.id);
        try {
            // Import updateAbsence dynamically or use the one from actions if imported
            // We need to import updateAbsence at the top of the file
            await import('../actions').then(mod => mod.updateAbsence(editModal.absence.id, {
                startDate: new Date(editForm.startDate),
                endDate: new Date(editForm.endDate),
                type: editForm.type as any,
                reason: editForm.reason
            }));
            toast.success('Ausencia actualizada');
            setEditModal({ open: false, absence: null });
            await refreshData();
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar la ausencia');
        } finally {
            setProcessing(null);
        }
    };

    // ... inside render loop ...


    // Filters state
    const [filters, setFilters] = useState<AbsenceFilterValues>({
        search: '',
        status: '',
        department: '',
        userIds: [],
    });

    const buildFilterParams = useCallback(() => {
        const params: any = {};
        // Use tab as primary status filter, override with dropdown if set
        if (activeTab !== 'ALL') params.status = activeTab;
        if (filters.search) params.search = filters.search;
        if (filters.department) params.department = filters.department;
        if (filters.userIds.length > 0) params.userIds = filters.userIds;
        return Object.keys(params).length > 0 ? params : undefined;
    }, [filters, activeTab]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allAbsences, emps, absenceStats] = await Promise.all([
                    getAllAbsences(buildFilterParams()),
                    getEmployeesForFilter(),
                    getAbsenceStats()
                ]);
                setAbsences(allAbsences);
                setEmployees(emps);
                setStats(absenceStats);
            } catch (error) {
                console.error('Error fetching absences:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [buildFilterParams]);

    const refreshData = async () => {
        const [allAbsences, absenceStats] = await Promise.all([
            getAllAbsences(buildFilterParams()),
            getAbsenceStats()
        ]);
        setAbsences(allAbsences);
        setStats(absenceStats);
    };

    const handleApprove = async (absenceId: string) => {
        setProcessing(absenceId);
        try {
            await processAbsenceRequest(absenceId, 'APPROVED');
            toast.success('Ausencia aprobada correctamente');
            await refreshData();
        } catch (error) {
            toast.error('Error al aprobar la ausencia');
        } finally {
            setProcessing(null);
        }
    };

    const openRejectModal = (absenceId: string, userName: string) => {
        setRejectModal({ open: true, absenceId, userName });
        setRejectNote('');
    };

    const handleReject = async () => {
        if (!rejectNote.trim()) {
            toast.error('Por favor, indica el motivo del rechazo');
            return;
        }
        setProcessing(rejectModal.absenceId);
        try {
            await processAbsenceRequest(rejectModal.absenceId, 'REJECTED', rejectNote);
            toast.success('Ausencia rechazada');
            setRejectModal({ open: false, absenceId: '', userName: '' });
            await refreshData();
        } catch (error) {
            toast.error('Error al rechazar la ausencia');
        } finally {
            setProcessing(null);
        }
    };

    const getTypeName = (type: string) => {
        const types: Record<string, string> = {
            VACATION: 'Vacaciones', SICK: 'Enfermedad', PERSONAL: 'Personal',
            MATERNITY: 'Maternidad', PATERNITY: 'Paternidad', UNPAID: 'Sin sueldo', OTHER: 'Otro'
        };
        return types[type] || type;
    };

    const getTypeColor = (type: string) => {
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
        return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status] || styles.CANCELLED}`}>{labels[status] || status}</span>;
    };

    const getDepartmentName = (dept: string) => {
        const names: Record<string, string> = {
            CIVIL_DESIGN: 'Diseño Civil', ELECTRICAL: 'Eléctrica', INSTRUMENTATION: 'Instrumentación',
            ADMINISTRATION: 'Administración', IT: 'IT', ECONOMIC: 'Económico', MARKETING: 'Marketing', OTHER: 'Otro',
        };
        return names[dept] || dept;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const tabs: { key: StatusTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'PENDING', label: 'Pendientes', icon: <Clock className="w-4 h-4" />, count: stats?.pending },
        { key: 'APPROVED', label: 'Aprobadas', icon: <CheckCircle className="w-4 h-4" />, count: stats?.approvedThisMonth },
        { key: 'REJECTED', label: 'Rechazadas', icon: <XCircle className="w-4 h-4" />, count: stats?.rejectedThisMonth },
        { key: 'ALL', label: 'Todas', icon: <CalendarDays className="w-4 h-4" /> },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/hr" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                            Gestión de Ausencias
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400">
                            Administra las solicitudes del equipo
                        </p>
                    </div>
                </div>
                <Link
                    href="/hr/absences/calendar"
                    className="px-4 py-2.5 bg-olive-600 text-white rounded-xl hover:bg-olive-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                >
                    <Calendar className="w-4 h-4" />
                    Ver Calendario
                </Link>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Pending */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Pendientes</p>
                                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
                                <p className="text-xs text-neutral-400 mt-1">solicitudes por revisar</p>
                            </div>
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                        {stats.pending > 0 && (
                            <div className="absolute top-3 right-3">
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                            </div>
                        )}
                    </motion.div>

                    {/* Approved */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Aprobadas</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.approvedThisMonth}</p>
                                <p className="text-xs text-neutral-400 mt-1">este mes</p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Rejected */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Rechazadas</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.rejectedThisMonth}</p>
                                <p className="text-xs text-neutral-400 mt-1">este mes</p>
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Absent Today */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Ausentes Hoy</p>
                                <p className="text-3xl font-bold text-olive-600 dark:text-olive-400 mt-1">{stats.absentToday?.length || 0}</p>
                                {stats.absentToday?.length > 0 && (
                                    <div className="flex -space-x-2 mt-2">
                                        {stats.absentToday.slice(0, 5).map((a: any) => (
                                            <div key={a.id} className="w-7 h-7 rounded-full bg-olive-100 dark:bg-olive-900/30 border-2 border-white dark:border-neutral-800 flex items-center justify-center text-xs font-medium text-olive-700 dark:text-olive-400" title={a.user?.name}>
                                                {a.user?.name?.charAt(0)}
                                            </div>
                                        ))}
                                        {stats.absentToday.length > 5 && (
                                            <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 border-2 border-white dark:border-neutral-800 flex items-center justify-center text-xs font-medium">
                                                +{stats.absentToday.length - 5}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-olive-100 dark:bg-olive-900/30 rounded-xl">
                                <UserMinus className="w-6 h-6 text-olive-600 dark:text-olive-400" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Status Tabs */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-1.5">
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-olive-600 text-white shadow-sm'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${activeTab === tab.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <AbsenceFilters
                filters={filters}
                onChange={setFilters}
                users={employees}
                showStatusFilter={false}
            />

            {/* Absences List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
                    </div>
                ) : absences.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center py-16">
                        <CalendarDays className="w-14 h-14 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                        <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                            No hay solicitudes {activeTab !== 'ALL' && (activeTab === 'PENDING' ? 'pendientes' : activeTab === 'APPROVED' ? 'aprobadas' : 'rechazadas')}
                        </p>
                        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                            {activeTab === 'PENDING' ? '¡Todo al día! 🎉' : 'Prueba cambiando los filtros'}
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 px-1">
                            {absences.length} solicitud{absences.length !== 1 ? 'es' : ''}
                        </p>
                        <AnimatePresence mode="popLayout">
                            {absences.map((absence, idx) => (
                                <motion.div
                                    key={absence.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Employee info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {/* Avatar */}
                                            {absence.user?.image ? (
                                                <img src={absence.user.image} alt="" className="w-11 h-11 rounded-full object-cover bg-neutral-100 flex-shrink-0" />
                                            ) : (
                                                <div className="w-11 h-11 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-olive-600 font-bold text-lg flex-shrink-0">
                                                    {absence.user?.name?.charAt(0) || '?'}
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                {/* Name + Department */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-neutral-900 dark:text-white">
                                                        {absence.user?.name}
                                                    </p>
                                                    {absence.user?.department && (
                                                        <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full">
                                                            {getDepartmentName(absence.user.department)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Type badge + dates */}
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getTypeColor(absence.type)}`}>
                                                        {getTypeName(absence.type)}
                                                    </span>
                                                    <span className="text-sm text-neutral-600 dark:text-neutral-300">
                                                        {formatDate(absence.startDate)} → {formatDate(absence.endDate)}
                                                    </span>
                                                    <span className="text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-900 px-2 py-0.5 rounded-md">
                                                        {absence.totalDays} {absence.totalDays === 1 ? 'día' : 'días'}
                                                    </span>
                                                </div>

                                                {/* Reason */}
                                                {absence.reason && (
                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 italic">
                                                        &ldquo;{absence.reason}&rdquo;
                                                    </p>
                                                )}

                                                {/* Rejection note */}
                                                {absence.rejectionNote && (
                                                    <p className="text-sm text-red-500 dark:text-red-400 mt-2 flex items-center gap-1.5">
                                                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                        {absence.rejectionNote}
                                                    </p>
                                                )}

                                                {/* Approved by */}
                                                {absence.approvedBy?.name && absence.status === 'APPROVED' && (
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Aprobada por {absence.approvedBy.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Status + Actions */}
                                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                            {getStatusBadge(absence.status)}

                                            {absence.status === 'PENDING' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(absence.id)}
                                                        disabled={processing === absence.id}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-lg text-green-700 dark:text-green-400 transition-colors text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(absence.id, absence.user?.name || '')}
                                                        disabled={processing === absence.id}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg text-red-700 dark:text-red-400 transition-colors text-sm font-medium disabled:opacity-50"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        Rechazar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* Rejection Modal */}
            <AnimatePresence>
                {rejectModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setRejectModal({ open: false, absenceId: '', userName: '' })}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-neutral-200 dark:border-neutral-700"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Rechazar Solicitud</h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">de {rejectModal.userName}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setRejectModal({ open: false, absenceId: '', userName: '' })}
                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Motivo del rechazo <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={rejectNote}
                                        onChange={e => setRejectNote(e.target.value)}
                                        placeholder="Explica brevemente por qué se rechaza la solicitud..."
                                        rows={3}
                                        autoFocus
                                        className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setRejectModal({ open: false, absenceId: '', userName: '' })}
                                        className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={!rejectNote.trim() || processing !== null}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                        Confirmar Rechazo
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Edit Modal */}
            <AnimatePresence>
                {editModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setEditModal({ open: false, absence: null })}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-neutral-200 dark:border-neutral-700"
                        >
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Editar Solicitud</h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Desde</label>
                                        <input
                                            type="date"
                                            value={editForm.startDate}
                                            onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Hasta</label>
                                        <input
                                            type="date"
                                            value={editForm.endDate}
                                            onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tipo</label>
                                    <select
                                        value={editForm.type}
                                        onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                                    >
                                        <option value="VACATION">Vacaciones</option>
                                        <option value="SICK">Enfermedad</option>
                                        <option value="PERSONAL">Personal</option>
                                        <option value="MATERNITY">Maternidad</option>
                                        <option value="PATERNITY">Paternidad</option>
                                        <option value="UNPAID">Sin sueldo</option>
                                        <option value="OTHER">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Motivo</label>
                                    <textarea
                                        value={editForm.reason}
                                        onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                                        rows={2}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setEditModal({ open: false, absence: null })}
                                        className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={submitEdit}
                                        disabled={processing !== null}
                                        className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-xl hover:bg-olive-700 font-medium disabled:opacity-50"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
