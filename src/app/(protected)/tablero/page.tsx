'use client';

import { useState } from 'react';
import ProjectSidebar from '@/components/tablero/ProjectSidebar';
import MondayBoard from '@/components/tablero/MondayBoard';

export default function TableroPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [boardKey, setBoardKey] = useState(0);

    return (
        <div className="flex h-full overflow-hidden">
            <ProjectSidebar
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onProjectCreated={() => setBoardKey(k => k + 1)}
            />
            <div className="flex-1 min-w-0">
                <MondayBoard
                    key={boardKey}
                    filterProjectId={selectedProjectId}
                />
            </div>
        </div>
    );
}
