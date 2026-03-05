'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface PipelineColumnProps {
    stage: {
        id: string; // Used strictly for Dnd-kit (can be pipelineStage.id or enum string)
        name: string;
        color?: string;
    };
    leads: any[];
    onLeadClick: (lead: any) => void;
    onAddLeadClick: (stageId: string) => void;
}

export default function PipelineColumn({ stage, leads, onLeadClick, onAddLeadClick }: PipelineColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
        data: {
            type: 'Column',
            stage
        }
    });

    const totalValue = leads.reduce((acc, lead) => acc + Number(lead.value), 0);
    const color = stage.color || '#6b7280'; // fallback gray

    return (
        <div className="flex flex-col flex-shrink-0 w-80 bg-neutral-50/50 dark:bg-neutral-900/40 rounded-xl h-full overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {/* Header */}
            <div className="p-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700/80 sticky top-0 z-10 shrink-0">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <h3 className="font-bold text-neutral-900 dark:text-white capitalize truncate">{stage.name}</h3>
                        <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">
                            {leads.length}
                        </span>
                    </div>
                    <button
                        onClick={() => onAddLeadClick(stage.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                        title="Añadir lead"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {formatCurrency(totalValue)}
                </div>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 overflow-y-auto min-h-[150px] flex flex-col gap-3 transition-colors ${isOver ? 'bg-olive-50/50 dark:bg-olive-900/10' : ''
                    }`}
            >
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    {leads.map((lead) => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={() => onLeadClick(lead)}
                        />
                    ))}
                </SortableContext>

                {leads.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-400">
                        Arrastra leads aquí
                    </div>
                )}
            </div>
        </div>
    );
}
