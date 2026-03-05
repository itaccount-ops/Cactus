import { getCrmQuotes } from '@/lib/crm/actions';
import { formatCurrency } from '@/lib/utils';
import { Search, Filter, MoreHorizontal, FileText, Download, Send } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
    const quotes = await getCrmQuotes();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Cotizaciones</h1>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar cotización..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow dark:text-neutral-100"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex-1 sm:flex-none">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>
                        <button className="px-4 py-2 text-sm font-bold text-white bg-olive-600 hover:bg-olive-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            Nueva Cotización
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Número</th>
                                <th className="px-6 py-4 font-semibold">Cliente / Lead</th>
                                <th className="px-6 py-4 font-semibold">Fecha</th>
                                <th className="px-6 py-4 font-semibold">Válida hasta</th>
                                <th className="px-6 py-4 font-semibold">Total</th>
                                <th className="px-6 py-4 font-semibold">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/50">
                            {quotes.map((quote) => (
                                <tr key={quote.id} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-neutral-400" />
                                            {quote.number}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-neutral-900 dark:text-white">{quote.client.name}</div>
                                        {quote.lead && <div className="text-xs text-neutral-500 truncate max-w-[200px]">Lead: {quote.lead.title}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">
                                        {new Date(quote.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">
                                        {new Date(quote.validUntil).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-olive-700 dark:text-olive-400">
                                        {formatCurrency(Number(quote.total))}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${quote.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' :
                                                quote.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' :
                                                    quote.status === 'CONVERTED' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50' :
                                                        quote.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50' :
                                                            'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-900/20 dark:text-neutral-400 dark:border-neutral-800/50'
                                            }`}>
                                            {quote.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                                        <button className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Descargar PDF">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title="Enviar por email">
                                            <Send className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-neutral-400 hover:text-olive-600 dark:hover:text-olive-400 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Opciones">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {quotes.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 bg-white dark:bg-neutral-800">
                                        No se han encontrado cotizaciones.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
