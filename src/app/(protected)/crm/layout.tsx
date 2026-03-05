'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, KanbanSquare, Building2, Target, FileText, ActivitySquare } from 'lucide-react';

const TABS = [
    { name: 'Dashboard CRM', href: '/crm/dashboard', icon: LayoutDashboard },
    { name: 'Pipeline', href: '/crm/pipeline', icon: KanbanSquare },
    { name: 'Clientes', href: '/crm/clients', icon: Building2 },
    { name: 'Leads', href: '/crm/leads', icon: Target },
    { name: 'Cotizaciones', href: '/crm/quotes', icon: FileText },
    { name: 'Actividades', href: '/crm/activities', icon: ActivitySquare },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-full flex flex-col">
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10 px-4 sm:px-6 lg:px-8">
                <nav className="-mb-px flex space-x-1 overflow-x-auto py-2">
                    {TABS.map((tab) => {
                        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={`
                                    whitespace-nowrap flex items-center py-2 px-4 border-b-2 font-medium text-sm transition-colors rounded-t-lg
                                    ${isActive
                                        ? 'border-olive-500 text-olive-600 bg-olive-50/50 dark:bg-olive-900/20 dark:text-olive-400 dark:border-olive-400'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:border-neutral-600'
                                    }
                                `}
                            >
                                <Icon className={`mr-2 h-4 w-4 ${isActive ? 'text-olive-500 dark:text-olive-400' : 'text-neutral-400'}`} />
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </div>
        </div>
    );
}
