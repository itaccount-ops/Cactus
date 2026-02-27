import Link from 'next/link';

export const dynamic = 'force-static';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 p-4">
            <h2 className="text-4xl font-bold mb-4">404</h2>
            <p className="text-xl mb-8">Página no encontrada</p>
            <Link
                href="/dashboard"
                className="px-6 py-3 bg-olive-600 hover:bg-olive-700 text-white rounded-lg transition-colors"
            >
                Volver al Inicio
            </Link>
        </div>
    );
}
