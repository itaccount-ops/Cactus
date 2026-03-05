'use client';

import { useState, useEffect } from 'react';
import { getClientDetail } from '@/lib/crm/actions';
import { X, Phone, Mail, Building, Activity, FileText, CheckCircle } from 'lucide-react';

interface ClientDetailPanelProps {
    clientId: string | null;
    onClose: () => void;
}

export default function ClientDetailPanel({ clientId, onClose }: ClientDetailPanelProps) {
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!clientId) {
            setClient(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        getClientDetail(clientId).then(data => {
            if (isMounted) {
                setClient(data);
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, [clientId]);

    if (!clientId) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                        Ficha de Cliente
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
                    ) : client ? (
                        <div className="space-y-6">

                            {/* Main Info */}
                            <div>
                                <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 leading-tight">
                                    {client.name}
                                </h1>
                                {client.companyName && (
                                    <h2 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-4 flex items-center gap-2">
                                        <Building className="w-4 h-4" /> {client.companyName}
                                    </h2>
                                )}
                            </div>

                            <hr className="border-neutral-200 dark:border-neutral-800" />

                            {/* Contact Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                {(client.email || client.phone) && (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Contacto Principal</h3>
                                        {client.email && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium text-neutral-900 dark:text-white">{client.email}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium text-neutral-900 dark:text-white">{client.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Leads */}
                            {client.leads?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-neutral-500" />
                                        Leads Pendientes / Recientes
                                    </h3>
                                    <div className="space-y-2">
                                        {client.leads.slice(0, 3).map((lead: any) => (
                                            <div key={lead.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-sm text-neutral-900 dark:text-white">{lead.title}</p>
                                                    <p className="text-xs text-neutral-500">{lead.stage}</p>
                                                </div>
                                                <span className="text-xs font-bold text-olive-600 dark:text-olive-400 bg-olive-50 dark:bg-olive-900/30 px-2 py-0.5 rounded-full">
                                                    €{Number(lead.value).toLocaleString('es-ES')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Projects */}
                            {client.projects?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-neutral-500" />
                                        Proyectos
                                    </h3>
                                    <div className="space-y-2">
                                        {client.projects.map((proj: any) => (
                                            <div key={proj.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg flex justify-between items-center">
                                                <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate pr-2">{proj.name}</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${proj.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        proj.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                            'bg-neutral-100 text-neutral-700 border-neutral-200'
                                                    } border`}>
                                                    {proj.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="h-6" />

                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 mt-10">No se encontró el cliente.</p>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0 flex gap-2">
                    <button className="flex-1 bg-olive-600 hover:bg-olive-700 text-white py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        Crear Nuevo Lead
                    </button>
                    <button className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/70 text-neutral-900 dark:text-white py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        Añadir Actividad
                    </button>
                </div>
            </div>
        </div>
    );
}
