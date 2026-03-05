'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrency } from '@/lib/utils';
import { GripVertical, Clock, CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface LeadCardProps {
    lead: any; // Type accurately in production
    onClick: () => void;
}

export default function LeadCard({ lead, onClick }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: {
            type: 'Lead',
            lead,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-white/50 dark:bg-neutral-800/50 border-2 border-dashed border-olive-400 rounded-lg p-3 min-h-[120px] opacity-40 shrink-0"
            />
        );
    }

    const valueNum = Number(lead.value);
    // Number of days since updatedAt
    const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    const pendingActivitiesCount = lead._count?.activities || 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className="group relative bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-olive-300 dark:hover:border-olive-500 shrink-0 flex flex-col gap-2"
        >
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 capitalize truncate mb-0.5">
                        {lead.client?.companyName || lead.client?.name || 'Sin cliente'}
                    </p>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-2 leading-tight">
                        {lead.title}
                    </h4>
                </div>

                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="p-1 -mr-1 -mt-1 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                >
                    <GripVertical className="h-4 w-4" />
                </div>
            </div>

            <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-olive-600 dark:text-olive-400 bg-olive-50 dark:bg-olive-900/30 px-2 py-0.5 rounded-full">
                    {formatCurrency(valueNum)}
                </span>

                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 px-1">
                    {lead.probability}%
                </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/50 mt-1">
                <div className="flex -space-x-1">
                    {lead.assignedTo ? (
                        <div className="w-6 h-6 rounded-full bg-olive-200 dark:bg-olive-700 flex items-center justify-center border border-white dark:border-neutral-800 text-[10px] font-bold text-olive-800 dark:text-olive-200 overflow-hidden relative" title={lead.assignedTo.name}>
                            {lead.assignedTo.image ? (
                                <Image src={lead.assignedTo.image} alt={lead.assignedTo.name} fill className="object-cover" sizes="24px" />
                            ) : (
                                lead.assignedTo.name.substring(0, 2).toUpperCase()
                            )}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-500" title="Sin asignar">
                            --
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Temperature Indicator */}
                    {lead.temperature === 'HOT' && <span title="Alta prioridad (Caliente)" className="text-[10px] text-red-500">🔥</span>}
                    {lead.temperature === 'WARM' && <span title="Prioridad media (Templado)" className="text-[10px] text-orange-400">☀️</span>}
                    {lead.temperature === 'COLD' && <span title="Baja prioridad (Frío)" className="text-[10px] text-blue-400">❄️</span>}

                    {/* Score */}
                    {lead.score > 0 && (
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400" title="Lead Score">
                            ★{lead.score}
                        </span>
                    )}

                    {pendingActivitiesCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400" title={`${pendingActivitiesCount} actividades pendientes`}>
                            <CheckCircle className="w-3 h-3" />
                            <span>{pendingActivitiesCount}</span>
                        </div>
                    )}
                    <div className={`flex items-center gap-1 text-[10px] font-medium ${daysSinceUpdate > 14 ? 'text-red-500' : 'text-neutral-400 dark:text-neutral-500'}`} title={`Sin actividad hace ${daysSinceUpdate} días`}>
                        <Clock className="w-3 h-3" />
                        <span>{daysSinceUpdate}d</span>
                    </div>
                </div>
            </div>

            {/* Tags (Bottom row) */}
            {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {lead.tags.slice(0, 3).map((tag: string, index: number) => (
                        <span key={index} className="text-[9px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">
                            {tag}
                        </span>
                    ))}
                    {lead.tags.length > 3 && (
                        <span className="text-[9px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 px-1.5 py-0.5 rounded">
                            +{lead.tags.length - 3}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
