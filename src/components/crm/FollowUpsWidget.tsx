import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function FollowUpsWidget() {
    const session = await auth();
    const user = session?.user as any;

    if (!user) return null;

    // Find active leads (not won or lost) that don't have any incomplete activity in the future
    const leadsNeedingFollowUp = await prisma.lead.findMany({
        where: {
            companyId: user.companyId!,
            stage: {
                notIn: ['CLOSED_WON', 'CLOSED_LOST']
            },
            crmActivities: {
                none: {
                    completed: false,
                    date: {
                        gte: new Date()
                    }
                }
            }
        },
        select: {
            id: true,
            title: true,
            stage: true,
            updatedAt: true,
            temperature: true,
            client: {
                select: { name: true, companyName: true }
            }
        },
        orderBy: {
            updatedAt: 'asc' // Oldest meaning they need attention first
        },
        take: 5
    });

    if (leadsNeedingFollowUp.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-3">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">¡Todo al día!</h3>
                <p className="text-xs text-neutral-500">Todos tus leads activos tienen un seguimiento programado.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-red-200 dark:border-red-900/30 p-5 shadow-sm h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>

            <div className="flex items-center justify-between mb-4 pl-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    Requieren Seguimiento
                </h3>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                    {leadsNeedingFollowUp.length} Leads
                </span>
            </div>

            <div className="flex-1 space-y-3 pl-3">
                {leadsNeedingFollowUp.map(lead => {
                    const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

                    return (
                        <div key={lead.id} className="flex flex-col justify-center border-b border-neutral-100 dark:border-neutral-800 last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-start gap-2">
                                <Link href={`/crm/leads?id=${lead.id}`} className="font-semibold text-sm text-neutral-900 dark:text-white hover:text-olive-600 dark:hover:text-olive-400 transition-colors line-clamp-1">
                                    {lead.title}
                                </Link>

                                {lead.temperature === 'HOT' && <span title="Alta prioridad" className="text-[10px] text-red-500 shrink-0">🔥</span>}
                                {lead.temperature === 'WARM' && <span title="Prioridad media" className="text-[10px] text-orange-400 shrink-0">☀️</span>}
                                {lead.temperature === 'COLD' && <span title="Baja prioridad" className="text-[10px] text-blue-400 shrink-0">❄️</span>}
                            </div>

                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-neutral-500 truncate">
                                    {lead.client?.companyName || lead.client?.name || 'Sin cliente'}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium shrink-0">
                                    <Clock className="w-3 h-3" />
                                    <span>hace {daysSinceUpdate}d</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Link href="/crm/pipeline" className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs font-bold text-olive-600 dark:text-olive-400 flex items-center justify-center gap-1 hover:text-olive-700 dark:hover:text-olive-300 transition-colors group pl-3">
                Ir al Pipeline <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
