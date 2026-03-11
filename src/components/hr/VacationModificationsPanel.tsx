'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getVacationModifications, processVacationModification } from '@/app/(protected)/hr/actions';
import { useToast } from '@/components/ui/Toast';

type ModStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const TYPE_LABELS: Record<string, string> = {
    CHANGE_DATES:    'Cambio de fechas',
    CANCEL_APPROVED: 'Cancelar ausencia aprobada',
    ADD_DAYS:        'Añadir días',
    REDUCE_DAYS:     'Reducir días',
};

const STATUS_STYLES: Record<ModStatus, string> = {
    PENDING:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function VacationModificationsPanel() {
    const [mods, setMods] = useState<any[]>([]);
    const [filter, setFilter] = useState<ModStatus | 'ALL'>('PENDING');
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);
    const toast = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await getVacationModifications(filter === 'ALL' ? undefined : filter);
            setMods(data);
        } catch (err: any) {
            toast.error(err.message ?? 'Error al cargar modificaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const handleProcess = async (id: string, action: 'APPROVED' | 'REJECTED') => {
        setProcessing(id);
        try {
            await processVacationModification(id, action, action === 'REJECTED' ? rejectNote : undefined);
            toast.success(action === 'APPROVED' ? 'Modificación aprobada' : 'Modificación rechazada');
            setRejectNote('');
            setExpanded(null);
            await load();
        } catch (err: any) {
            toast.error(err.message ?? 'Error al procesar');
        } finally {
            setProcessing(null);
        }
    };

    const pendingCount = mods.filter(m => m.status === 'PENDING').length;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Solicitudes de Modificación</h3>
                    {pendingCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded-full">
                            {pendingCount} pendientes
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <select value={filter} onChange={e => setFilter(e.target.value as any)}
                        className="text-sm px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 outline-none">
                        <option value="ALL">Todas</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="APPROVED">Aprobadas</option>
                        <option value="REJECTED">Rechazadas</option>
                    </select>
                    <button onClick={load} className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 animate-pulse flex gap-3">
                            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 bg-neutral-100 dark:bg-neutral-700 rounded" />
                                <div className="h-3 w-2/3 bg-neutral-100 dark:bg-neutral-700 rounded" />
                            </div>
                        </div>
                    ))
                ) : mods.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Sin solicitudes de modificación</p>
                    </div>
                ) : (
                    mods.map(mod => (
                        <div key={mod.id}>
                            <button onClick={() => setExpanded(expanded === mod.id ? null : mod.id)}
                                className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center text-sm font-bold text-olive-700 dark:text-olive-400 shrink-0">
                                    {mod.user?.name?.charAt(0).toUpperCase() ?? '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-neutral-900 dark:text-white text-sm">{mod.user?.name}</span>
                                        <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${STATUS_STYLES[mod.status as ModStatus]}`}>
                                            {mod.status === 'PENDING' ? 'Pendiente' : mod.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                                        {TYPE_LABELS[mod.type] ?? mod.type} · {new Date(mod.createdAt).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                                {expanded === mod.id ? <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />}
                            </button>

                            <AnimatePresence>
                                {expanded === mod.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden">
                                        <div className="px-4 pb-4 space-y-3 bg-neutral-50 dark:bg-neutral-900/30">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-neutral-500">Tipo:</span>
                                                    <span className="ml-1 font-medium text-neutral-900 dark:text-white">{TYPE_LABELS[mod.type]}</span>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-500">Días:</span>
                                                    <span className="ml-1 font-medium text-neutral-900 dark:text-white">{mod.totalDays}</span>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-500">Desde:</span>
                                                    <span className="ml-1 font-medium">{new Date(mod.startDate).toLocaleDateString('es-ES')}</span>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-500">Hasta:</span>
                                                    <span className="ml-1 font-medium">{new Date(mod.endDate).toLocaleDateString('es-ES')}</span>
                                                </div>
                                            </div>
                                            {mod.description && (
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-800 rounded-lg p-3 border border-neutral-200 dark:border-neutral-700">
                                                    {mod.description}
                                                </p>
                                            )}
                                            {mod.absence && (
                                                <p className="text-xs text-neutral-500">
                                                    Ausencia original: {mod.absence.type} · {new Date(mod.absence.startDate).toLocaleDateString('es-ES')} – {new Date(mod.absence.endDate).toLocaleDateString('es-ES')}
                                                </p>
                                            )}
                                            {mod.reviewNote && (
                                                <p className="text-xs text-neutral-500 italic">Nota HR: {mod.reviewNote}</p>
                                            )}

                                            {/* Actions (only for PENDING) */}
                                            {mod.status === 'PENDING' && (
                                                <div className="space-y-2">
                                                    <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                                                        className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none resize-none focus:ring-2 focus:ring-olive-500"
                                                        rows={2} placeholder="Nota de revisión (opcional para aprobar, recomendado para rechazar)…" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleProcess(mod.id, 'APPROVED')} disabled={!!processing}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors disabled:opacity-50">
                                                            <CheckCircle className="w-4 h-4" /> Aprobar
                                                        </button>
                                                        <button onClick={() => handleProcess(mod.id, 'REJECTED')} disabled={!!processing}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50">
                                                            <XCircle className="w-4 h-4" /> Rechazar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
