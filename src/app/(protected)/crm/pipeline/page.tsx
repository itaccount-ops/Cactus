import { getCrmPipelineStages, getCrmPipelineLeads } from '@/lib/crm/actions';
import PipelineBoard from '@/components/crm/PipelineBoard';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
    const [stages, rawLeads] = await Promise.all([
        getCrmPipelineStages(),
        getCrmPipelineLeads()
    ]);

    // Convert Prisma Decimal to number for Next.js Client Component serialization
    const leads = rawLeads.map(lead => ({
        ...lead,
        value: Number(lead.value || 0)
    }));

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Pipeline de Ventas</h1>
                <button className="bg-olive-600 hover:bg-olive-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                    Nuevo Lead
                </button>
            </div>

            <div className="flex-1 min-h-0 bg-neutral-100/50 dark:bg-black/20 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden relative shadow-inner">
                {/* Horizontal scroll inside PipelineBoard */}
                <PipelineBoard initialStages={stages} initialLeads={leads} />
            </div>
        </div>
    );
}
