'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, Briefcase, ClipboardList, BarChart, DollarSign, Grid3X3 } from 'lucide-react';
import { useSession } from 'next-auth/react';

const TABS = [
    {
        href: '/control-horas/mi-hoja',
        label: 'Mi Hoja',
        icon: Calendar,
        description: 'Tu control mensual',
        roles: ['WORKER', 'MANAGER', 'ADMIN', 'SUPERADMIN']
    },
    {
        href: '/control-horas/equipo',
        label: 'Equipo',
        icon: Users,
        description: 'Estado del equipo',
        roles: ['MANAGER', 'ADMIN', 'SUPERADMIN']
    },
    {
        href: '/control-horas/proyectos',
        label: 'Por Proyecto',
        icon: Briefcase,
        description: 'Horas por proyecto',
        roles: ['MANAGER', 'ADMIN', 'SUPERADMIN']
    },
    {
        href: '/control-horas/matriz',
        label: 'Matriz',
        icon: Grid3X3,
        description: 'Proyectos × Personas',
        roles: ['MANAGER', 'ADMIN', 'SUPERADMIN']
    },
    {
        href: '/control-horas/global',
        label: 'Panel Global',
        icon: ClipboardList,
        description: 'Dashboard global de horas',
        roles: ['ADMIN', 'SUPERADMIN']
    },
    {
        href: '/control-horas/cep',
        label: 'CEP',
        icon: DollarSign,
        description: 'Control Económico por Proyecto',
        roles: ['MANAGER', 'ADMIN', 'SUPERADMIN']
    }
];

export default function ControlHorasLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = session?.user?.role;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-1 overflow-x-auto py-2" aria-label="Tabs">
                        {TABS.map((tab) => {
                            if (userRole && tab.roles && !tab.roles.includes(userRole)) return null;

                            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
                            const Icon = tab.icon;

                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                                        transition-all whitespace-nowrap
                                        ${isActive
                                            ? 'bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400'
                                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-200'
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    <span>{tab.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Page Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </div>
        </div>
    );
}
