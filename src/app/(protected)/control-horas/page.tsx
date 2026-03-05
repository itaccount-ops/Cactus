import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function ControlHorasPage() {
    const session = await auth();
    const role = (session?.user as any)?.role ?? 'WORKER';

    // Workers only see the daily register (Registro Diario) — redirect there
    if (role === 'WORKER') {
        redirect('/hours');
    }

    // Managers, admins and superadmins land on Mi Hoja
    redirect('/control-horas/mi-hoja');
}
