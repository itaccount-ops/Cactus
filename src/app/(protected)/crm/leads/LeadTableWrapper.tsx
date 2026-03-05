'use client';

import { useState } from 'react';
import LeadTable from '@/components/crm/LeadTable';
import LeadDetailPanel from '@/components/crm/LeadDetailPanel';

interface LeadTableWrapperProps {
    initialLeads: any[];
}

export default function LeadTableWrapper({ initialLeads }: LeadTableWrapperProps) {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    return (
        <>
            <LeadTable
                leads={initialLeads}
                onRowClick={(id) => setSelectedLeadId(id)}
            />

            <LeadDetailPanel
                leadId={selectedLeadId}
                onClose={() => setSelectedLeadId(null)}
            />
        </>
    );
}
