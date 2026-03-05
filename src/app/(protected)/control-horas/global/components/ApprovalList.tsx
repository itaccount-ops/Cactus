'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { getPendingApprovals, approveTimeEntries, rejectTimeEntries } from '@/lib/work-time-tracking/actions';
import { useToast } from '@/components/ui/Toast';

export default function ApprovalList() {
    const toast = useToast();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadEntries = async () => {
        try {
            setLoading(true);
            const data = await getPendingApprovals();
            setEntries(data);
        } catch (error) {
            toast.error('Error', 'Error al cargar horas pendientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEntries();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await approveTimeEntries([id]);
            toast.success('Éxito', 'Horas aprobadas correctamente');
            loadEntries();
        } catch (error: any) {
            toast.error('Error', error.message || 'Error al aprobar las horas');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!selectedEntryId || !rejectionReason.trim()) {
            toast.error('Error', 'Debes indicar un motivo de rechazo');
            return;
        }

        try {
            setProcessingId(selectedEntryId);
            await rejectTimeEntries([selectedEntryId], rejectionReason);
            toast.success('Éxito', 'Horas rechazadas correctamente');
            setRejectionModalOpen(false);
            setRejectionReason('');
            setSelectedEntryId(null);
            loadEntries();
        } catch (error: any) {
            toast.error('Error', error.message || 'Error al rechazar las horas');
            setRejectionModalOpen(false);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
                <Clock size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Todo al día</h3>
                <p className="text-neutral-500 dark:text-neutral-400">
                    No hay horas extra pendientes de aprobación.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <AlertCircle className="text-amber-500" size={20} />
                        Horas Pendientes de Aprobación ({entries.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Trabajador</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Proyecto</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase">Horas Extra</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Notas</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 font-medium">
                                        {new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                                        <span className="font-bold text-olive-600 dark:text-olive-400">{entry.project.code}</span>
                                        <span className="text-neutral-500 ml-2 text-sm">{entry.project.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                                            +{entry.hours.toFixed(2)}h
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-neutral-500 text-sm max-w-[200px] truncate" title={entry.notes}>
                                        {entry.notes || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleApprove(entry.id)}
                                                disabled={processingId === entry.id}
                                                className="p-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Aprobar"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedEntryId(entry.id); setRejectionModalOpen(true); }}
                                                disabled={processingId === entry.id}
                                                className="p-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Rechazar"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rejection Modal */}
            {rejectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Rechazar Horas Extra</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                Por favor, indica el motivo del rechazo para que el trabajador pueda verlo.
                            </p>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Motivo del rechazo..."
                                className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-olive-500 outline-none h-32 resize-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                            />
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3 border-t border-neutral-200 dark:border-neutral-700">
                            <button
                                onClick={() => { setRejectionModalOpen(false); setRejectionReason(''); setSelectedEntryId(null); }}
                                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || processingId !== null}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold disabled:opacity-50"
                            >
                                Confirmar Rechazo
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
