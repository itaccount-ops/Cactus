'use client';

import { useState } from 'react';
import ClientTable from '@/components/crm/ClientTable';
import ClientDetailPanel from '@/components/crm/ClientDetailPanel';

interface ClientTableWrapperProps {
    initialClients: any[];
}

export default function ClientTableWrapper({ initialClients }: ClientTableWrapperProps) {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    return (
        <>
            <ClientTable
                clients={initialClients}
                onRowClick={(id) => setSelectedClientId(id)}
            />

            <ClientDetailPanel
                clientId={selectedClientId}
                onClose={() => setSelectedClientId(null)}
            />
        </>
    );
}
