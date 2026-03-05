'use client';

import { CheckCircle, Phone, Mail, Users, FileText, Briefcase, Activity } from 'lucide-react';

interface ActivityTimelineProps {
    activities: any[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {

    function getActivityIcon(type: string, completed: boolean) {
        const baseClass = "w-4 h-4 ";
        if (completed) return <CheckCircle className={`${baseClass} text-white`} />;

        switch (type) {
            case 'CALL': return <Phone className={`${baseClass} text-white`} />;
            case 'EMAIL': return <Mail className={`${baseClass} text-white`} />;
            case 'MEETING': return <Users className={`${baseClass} text-white`} />;
            case 'NOTE': return <FileText className={`${baseClass} text-white`} />;
            case 'TASK': return <Activity className={`${baseClass} text-white`} />;
            case 'WHATSAPP': return <Phone className={`${baseClass} text-white`} />;
            default: return <Activity className={`${baseClass} text-white`} />;
        }
    }

    // Group activities by date
    const grouped = activities.reduce((acc, obj) => {
        const dateKey = new Date(obj.date).toLocaleDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(obj);
        return acc;
    }, {});

    if (activities.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-12 text-center shadow-sm">
                <Activity className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Sin actividades recientes</h3>
                <p className="text-sm text-neutral-500">Crea una actividad para empezar a rastrear el progreso.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-neutral-700 before:to-transparent">

                {Object.entries(grouped).map(([date, dayActivities]: [string, any]) => (
                    <div key={date} className="relative z-10">
                        <div className="flex justify-start md:justify-center mb-6">
                            <span className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                {date}
                            </span>
                        </div>

                        <div className="space-y-6">
                            {dayActivities.map((act: any, i: number) => {
                                const isEven = i % 2 === 0;

                                return (
                                    <div key={act.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active`}>

                                        {/* Marker icon */}
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-neutral-800 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${act.completed ? 'bg-green-500' : 'bg-olive-500'
                                            }`}>
                                            {getActivityIcon(act.type, act.completed)}
                                        </div>

                                        {/* Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow cursor-default">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{act.type}</div>
                                                <div className="text-xs text-neutral-400">
                                                    {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">{act.title}</h4>

                                            {act.description && (
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2 leading-relaxed">
                                                    {act.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                                {act.lead && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">
                                                        <Briefcase className="w-3 h-3" />
                                                        {act.lead.title}
                                                    </span>
                                                )}
                                                {act.client && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800/50">
                                                        <Users className="w-3 h-3" />
                                                        {act.client.name}
                                                    </span>
                                                )}

                                                <div className="flex-1" />

                                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                    {act.createdBy?.image ? (
                                                        <img src={act.createdBy.image} className="w-4 h-4 rounded-full" alt="" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[8px] font-bold">
                                                            {act.createdBy?.name?.substring(0, 2)}
                                                        </div>
                                                    )}
                                                    <span>{act.createdBy?.name}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

            </div>
        </div>
    );
}
