'use client';

import { useState, useEffect } from 'react';
import { getLeadDetail } from '@/lib/crm/actions';
import { X, Briefcase, User, Calendar, DollarSign, Activity, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import LeadTimeline from './LeadTimeline';

interface LeadDetailPanelProps {
    leadId: string | null;
    onClose: () => void;
}

export default function LeadDetailPanel({ leadId, onClose }: LeadDetailPanelProps) {
    const [lead, setLead] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!leadId) {
            setLead(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        getLeadDetail(leadId).then(data => {
            if (isMounted) {
                setLead(data);
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, [leadId]);

    if (!leadId) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                        Detalle del Lead
                    </h2>
                    <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100/50 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Activity className="w-8 h-8 text-olive-500 animate-spin" />
                        </div>
                    ) : lead ? (
                        <div className="space-y-6">

                            {/* Main Info */}
                            <div>
                                <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">
                                    {lead.title}
                                </h1>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-olive-100 dark:bg-olive-900/50 text-olive-700 dark:text-olive-300 text-xs font-bold px-2.5 py-1 rounded-full border border-olive-200 dark:border-olive-800">
                                        {lead.pipelineStage?.name || lead.stage}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {lead.description || 'Sin descripción adicional.'}
                                </p>
                            </div>

                            <hr className="border-neutral-200 dark:border-neutral-800" />

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Valor</p>
                                    <p className="font-bold text-neutral-900 dark:text-white">{formatCurrency(Number(lead.value))}</p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> Probabilidad</p>
                                    <p className="font-bold text-neutral-900 dark:text-white">{lead.probability}%</p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 col-span-2">
                                    <p className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Agente asignado</p>
                                    {lead.assignedTo ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            {lead.assignedTo.image ? (
                                                <Image src={lead.assignedTo.image} alt="Agent" width={24} height={24} className="rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-olive-200 flex items-center justify-center text-[10px] font-bold text-olive-800">
                                                    {lead.assignedTo.name?.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{lead.assignedTo.name}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-semibold text-neutral-400">Sin asignar</p>
                                    )}
                                </div>
                            </div>

                            {/* Client Info */}
                            {lead.client && (
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-neutral-500" />
                                        Cliente Asociado
                                    </h3>
                                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 rounded-xl">
                                        <p className="font-bold text-neutral-900 dark:text-white">{lead.client.name}</p>
                                        {lead.client.companyName && (
                                            <p className="text-sm text-neutral-500">{lead.client.companyName}</p>
                                        )}
                                        {lead.client.email && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{lead.client.email}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Activities Timeline */}
                            <div>
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-neutral-500" />
                                    Historial Completo
                                </h3>
                                <LeadTimeline leadId={lead.id} />
                            </div>

                            <div className="h-6" />

                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 mt-10">No se encontró el lead.</p>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex gap-2">
                    <button className="flex-1 bg-olive-600 hover:bg-olive-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        Añadir Actividad
                    </button>
                    <button className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 text-neutral-900 dark:text-white py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        Crear Cotización
                    </button>
                </div>
            </div>
        </div>
    );
}
