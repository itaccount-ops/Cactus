import { redirect } from 'next/navigation';

export default function HoursPage() {
    // This page has been merged into /control-horas/mi-hoja
    // The "Registro Diario" view is the "Detalle" mode inside Mi Hoja
    redirect('/control-horas/mi-hoja');
}
