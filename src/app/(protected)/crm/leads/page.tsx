import { getCrmLeads } from '@/lib/crm/actions';
import LeadTableWrapper from './LeadTableWrapper';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
    const rawLeads = await getCrmLeads();
    const leads = rawLeads.map(lead => ({
        ...lead,
        value: Number(lead.value || 0)
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Listado de Leads</h1>
            </div>

            <LeadTableWrapper initialLeads={leads} />
        </div>
    );
}
