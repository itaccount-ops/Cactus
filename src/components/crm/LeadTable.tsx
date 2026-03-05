'use client';

import { formatCurrency } from '@/lib/utils';
import { Search, Filter, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';

interface LeadTableProps {
    leads: any[];
    onRowClick: (leadId: string) => void;
}

export default function LeadTable({ leads, onRowClick }: LeadTableProps) {
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Buscar lead por título o cliente..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow dark:text-neutral-100"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex-1 sm:flex-none">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <button className="px-4 py-2 text-sm font-bold text-white bg-olive-600 hover:bg-olive-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                        Nuevo Lead
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Lead</th>
                            <th className="px-6 py-4 font-semibold">Cliente</th>
                            <th className="px-6 py-4 font-semibold">Valor</th>
                            <th className="px-6 py-4 font-semibold">Etapa</th>
                            <th className="px-6 py-4 font-semibold">Asignado</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/50">
                        {leads.map((lead) => (
                            <tr
                                key={lead.id}
                                onClick={() => onRowClick(lead.id)}
                                className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/80 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4 max-w-[250px]">
                                    <div className="font-bold text-neutral-900 dark:text-white truncate" title={lead.title}>{lead.title}</div>
                                    <div className="text-[10px] text-neutral-500 mt-1">
                                        Modificado: {new Date(lead.updatedAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-neutral-900 dark:text-neutral-200 font-medium">{lead.client?.name || '-'}</div>
                                    <div className="text-xs text-neutral-500">{lead.client?.companyName}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-olive-600 dark:text-olive-400 bg-olive-50 dark:bg-olive-900/30 inline-flex px-2 py-0.5 rounded-full border border-olive-100 dark:border-olive-800">
                                        {formatCurrency(Number(lead.value))}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-semibold text-center mt-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded">
                                        {lead.probability}% Prob
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold tracking-wide border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-sm">
                                        {lead.pipelineStage?.name || lead.stage}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {lead.assignedTo ? (
                                        <div className="flex items-center gap-2" title={lead.assignedTo.name}>
                                            <div className="w-7 h-7 rounded-full bg-olive-100 dark:bg-olive-900/50 flex flex-shrink-0 items-center justify-center text-[10px] font-bold text-olive-700 dark:text-olive-300 border border-olive-200 dark:border-olive-700">
                                                {lead.assignedTo.image ? (
                                                    <img src={lead.assignedTo.image} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    lead.assignedTo.name.substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate max-w-[100px] hidden lg:block">
                                                {lead.assignedTo.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-neutral-400 italic">Sin asignar</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        className="text-neutral-400 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                        onClick={(e) => { e.stopPropagation(); /* Menu handler */ }}
                                    >
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                    No se han encontrado oportunidades.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
