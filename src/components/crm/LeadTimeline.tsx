'use client';

import { useState, useEffect } from 'react';
import { getLeadTimeline } from '@/lib/crm/actions';
import { Activity, Phone, Mail, Users, FileText, CheckCircle, Info, RefreshCw, Briefcase } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

interface LeadTimelineProps {
    leadId: string;
}

export default function LeadTimeline({ leadId }: LeadTimelineProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        getLeadTimeline(leadId).then((data: any[]) => {
            if (isMounted) {
                setEvents(data);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, [leadId]);

    function getEventIcon(event: any) {
        const baseClass = "w-4 h-4 text-white";
        if (event.sourceType === 'LOG') {
            return <Info className={baseClass} />;
        }

        if (event.completed) return <CheckCircle className={baseClass} />;

        switch (event.type) {
            case 'CALL': return <Phone className={baseClass} />;
            case 'EMAIL': return <Mail className={baseClass} />;
            case 'MEETING': return <Users className={baseClass} />;
            case 'NOTE': return <FileText className={baseClass} />;
            case 'WHATSAPP': return <Phone className={baseClass} />;
            default: return <Activity className={baseClass} />;
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700">
                Aún no hay historial para este lead.
            </div>
        );
    }

    return (
        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-neutral-200 before:via-neutral-200 dark:before:from-neutral-700 dark:before:via-neutral-700 before:to-transparent pt-2 pb-6">
            <div className="space-y-6">
                {events.map((event) => {
                    const isLog = event.sourceType === 'LOG';

                    return (
                        <div key={event.id} className="relative flex items-start gap-4 z-10 group">
                            {/* Icon Marker */}
                            <div className={`w-10 h-10 mt-0.5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-neutral-900 shrink-0 shadow-sm
                                ${isLog ? 'bg-neutral-400' : event.completed ? 'bg-green-500' : 'bg-olive-500'}
                            `}>
                                {getEventIcon(event)}
                            </div>

                            {/* Content Card */}
                            <div className={`flex-1 border rounded-xl shadow-sm transition-shadow hover:shadow-md
                                ${isLog
                                    ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 p-3'
                                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 p-4'}
                            `}>
                                <div className="flex justify-between items-start mb-1.5">
                                    <h4 className={`font-bold ${isLog ? 'text-sm text-neutral-700 dark:text-neutral-300' : 'text-sm text-neutral-900 dark:text-white'}`}>
                                        {event.title}
                                    </h4>
                                    <span className="text-xs text-neutral-500 whitespace-nowrap ml-2 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">
                                        {new Date(event.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>

                                {event.description && (
                                    <p className={`text-sm mb-3 ${isLog ? 'text-neutral-500' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                        {event.description}
                                    </p>
                                )}

                                {/* Footer of Card */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
                                    <div className="flex items-center gap-2">
                                        {!isLog && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                                {event.type}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                        {event.userName ? (
                                            <>
                                                {event.userImage ? (
                                                    <Image src={event.userImage} width={16} height={16} className="rounded-full" alt="" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[8px] font-bold">
                                                        {event.userName.substring(0, 2)}
                                                    </div>
                                                )}
                                                <span>{event.userName.split(' ')[0]}</span>
                                            </>
                                        ) : (
                                            <span>Sistema</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
