'use client';

import { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import PipelineColumn from './PipelineColumn';
import LeadCard from './LeadCard';
import { moveLead } from '@/lib/crm/actions';
import { toast } from 'sonner';
import LeadDetailPanel from './LeadDetailPanel';

interface PipelineBoardProps {
    initialStages: any[];
    initialLeads: any[];
}

export default function PipelineBoard({ initialStages, initialLeads }: PipelineBoardProps) {
    const [leads, setLeads] = useState(initialLeads);
    const [activeLead, setActiveLead] = useState<any | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    // Sync state if props change (e.g. server revalidation)
    useEffect(() => {
        setLeads(initialLeads);
    }, [initialLeads]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const lead = leads.find(l => l.id === active.id);
        if (lead) setActiveLead(lead);
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveLead = active.data.current?.type === 'Lead';
        const isOverLead = over.data.current?.type === 'Lead';
        const isOverColumn = over.data.current?.type === 'Column';

        if (!isActiveLead) return;

        // Moving lead over another lead (in same or different column)
        if (isOverLead) {
            setLeads(prev => {
                const activeIndex = prev.findIndex(l => l.id === activeId);
                const overIndex = prev.findIndex(l => l.id === overId);

                const activeLead = prev[activeIndex];
                const overLead = prev[overIndex];

                if (activeLead.pipelineStageId !== overLead.pipelineStageId || activeLead.stage !== overLead.stage) {
                    // Changing column
                    const newLeads = [...prev];
                    newLeads[activeIndex] = {
                        ...activeLead,
                        pipelineStageId: overLead.pipelineStageId,
                        stage: overLead.stage
                    };
                    return arrayMove(newLeads, activeIndex, overIndex);
                }

                return arrayMove(prev, activeIndex, overIndex);
            });
        }

        // Moving over empty column
        if (isOverColumn) {
            setLeads(prev => {
                const activeIndex = prev.findIndex(l => l.id === activeId);
                const activeLead = prev[activeIndex];
                const overStage = over.data.current?.stage;

                // Fallback: If no custom pipelineStageId, just use enum (simplified assumption here is we use pipelineStageId)
                if (activeLead.pipelineStageId !== overStage.id) {
                    const newLeads = [...prev];
                    newLeads[activeIndex] = {
                        ...activeLead,
                        pipelineStageId: overStage.id,
                        stage: overStage.name // or map correctly if it's enum
                    };
                    return newLeads;
                }
                return prev;
            });
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveLead(null);
        const { active, over } = event;
        if (!over) return;

        const activeLeadId = active.id as string;
        const currentLeadState = leads.find(l => l.id === activeLeadId);

        if (!currentLeadState) return;

        // Find what the original state was vs new state
        const originalLead = initialLeads.find(l => l.id === activeLeadId);

        if (originalLead && originalLead.pipelineStageId !== currentLeadState.pipelineStageId) {
            // Trigger server action
            try {
                // Determine new enum stage (hack: map custom names back to enums if we use them strictly, or just save pipelineStageId)
                // Assuming moveLead mainly needs pipelineStageId updated
                // We pass 'NEW' as fallback enum stage, the real logic should map the column to a valid LeadStage if required by prisma constraints
                await moveLead(activeLeadId, originalLead.stage, currentLeadState.pipelineStageId);
            } catch (error) {
                console.error('Failed to move lead:', error);
                toast.error('Error al mover el lead');
                // Revert
                setLeads(initialLeads);
            }
        }
    }

    return (
        <div className="flex h-full overflow-hidden">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 p-4 overflow-x-auto w-full items-start h-[calc(100vh-14rem)] pb-8">
                    {initialStages.map(stage => {
                        const stageLeads = leads.filter(l => l.pipelineStageId === stage.id || l.stage === stage.name);
                        return (
                            <PipelineColumn
                                key={stage.id}
                                stage={stage}
                                leads={stageLeads}
                                onLeadClick={(lead) => setSelectedLeadId(lead.id)}
                                onAddLeadClick={(stageId) => console.log('Add', stageId)}
                            />
                        );
                    })}
                </div>

                {/* The item rendered when dragging */}
                <DragOverlay>
                    {activeLead && (
                        <LeadCard
                            lead={activeLead}
                            onClick={() => { }}
                        />
                    )}
                </DragOverlay>
            </DndContext>

            <LeadDetailPanel
                leadId={selectedLeadId}
                onClose={() => setSelectedLeadId(null)}
            />
        </div>
    );
}
