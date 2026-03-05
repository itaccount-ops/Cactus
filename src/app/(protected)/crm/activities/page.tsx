import { getCrmActivities } from '@/lib/crm/actions';
import ActivityTimeline from '@/components/crm/ActivityTimeline';
import { Search, Filter, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage() {
    const activities = await getCrmActivities();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Últimas Actividades</h1>
                    <p className="text-sm text-neutral-500 mt-1">Historial del equipo de ventas</p>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar en historial..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-shadow dark:text-neutral-100"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex-1 sm:flex-none">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-olive-600 hover:bg-olive-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            <Plus className="w-4 h-4" />
                            Nueva
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-neutral-50/30 dark:bg-neutral-900/10">
                    <div className="max-w-4xl mx-auto">
                        <ActivityTimeline activities={activities} />
                    </div>
                </div>
            </div>
        </div>
    );
}
