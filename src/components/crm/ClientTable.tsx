'use client';

import { formatCurrency } from '@/lib/utils';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

interface ClientTableProps {
    clients: any[];
    onRowClick: (clientId: string) => void;
}

export default function ClientTable({ clients, onRowClick }: ClientTableProps) {
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow dark:text-neutral-100"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex-1 sm:flex-none">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    <button className="px-4 py-2 text-sm font-bold text-white bg-olive-600 hover:bg-olive-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Cliente / Empresa</th>
                            <th className="px-6 py-4 font-semibold">Contacto</th>
                            <th className="px-6 py-4 font-semibold text-center">Leads Pendientes</th>
                            <th className="px-6 py-4 font-semibold text-center">Proyectos</th>
                            <th className="px-6 py-4 font-semibold">Estado</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/50">
                        {clients.map((client) => (
                            <tr
                                key={client.id}
                                onClick={() => onRowClick(client.id)}
                                className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/80 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-bold text-neutral-900 dark:text-white mb-0.5">{client.name}</div>
                                    <div className="text-xs text-neutral-500">{client.companyName || '-'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-neutral-900 dark:text-neutral-200 mb-0.5">{client.email || 'Sin email'}</div>
                                    <div className="text-xs text-neutral-500">{client.phone || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {client._count?.leads || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                                        {client._count?.projects || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${client.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' :
                                            client.status === 'PROSPECT' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50' :
                                                'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-900/20 dark:text-neutral-400 dark:border-neutral-800/50'
                                        }`}>
                                        {client.status}
                                    </span>
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
                        {clients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                                    No se han encontrado clientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
