import { getCrmClients } from '@/lib/crm/actions';
import ClientTableWrapper from './ClientTableWrapper';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
    const clients = await getCrmClients();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Directorio de Clientes</h1>
            </div>

            <ClientTableWrapper initialClients={clients} />
        </div>
    );
}
