'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderKanban, ChevronRight, Layers,
    Loader2, Building2, Calendar, Search, PanelLeftClose, PanelLeftOpen,
    Briefcase
} from 'lucide-react';
import { getProjectsForTablero } from '@/app/(protected)/tablero/actions';
import { useSession } from 'next-auth/react';

const DEPT_COLORS: Record<string, string> = {
    ELECTRICAL: 'bg-yellow-500',
    CIVIL_DESIGN: 'bg-blue-500',
    INSTRUMENTATION: 'bg-purple-500',
    MECHANICAL: 'bg-orange-500',
    ADMINISTRATION: 'bg-neutral-400',
    ENGINEERING: 'bg-green-500',
    ARCHITECTURE: 'bg-pink-500',
    IT: 'bg-cyan-500',
    OTHER: 'bg-neutral-400',
};

type ProjectItem = {
    id: string; code: string; name: string; year: number;
    department: string; clientName: string | null;
    taskCount: number; completedCount: number;
};

interface Props {
    selectedProjectId: string | null;
    onSelectProject: (id: string | null) => void;
    onProjectCreated: () => void;
}

export default function ProjectSidebar({ selectedProjectId, onSelectProject, onProjectCreated }: Props) {
    const { data: session } = useSession();

    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);

    const load = async () => {
        const data = await getProjectsForTablero();
        setProjects(data as ProjectItem[]);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filteredProjects = projects.filter(p =>
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className={`flex flex-col h-full shrink-0 border-r border-theme-primary surface-secondary overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>

            {/* Mi Trabajo — always on top */}
            {!isCollapsed && (
                <div className="px-2 pt-3 pb-1 shrink-0 border-b border-theme-primary/30">
                    <button
                        onClick={() => onSelectProject('my-work')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedProjectId === 'my-work'
                            ? 'bg-olive-100 text-olive-700 dark:bg-olive-900/50 dark:text-olive-300'
                            : 'text-theme-muted hover:text-theme-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                    >
                        <Briefcase className="w-4 h-4 shrink-0 text-olive-600" />
                        Mi trabajo
                    </button>
                </div>
            )}

            {/* Header: Proyectos + count badge */}
            <div className="px-4 pt-4 pb-2 shrink-0">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-olive-600 shrink-0" />
                            <span className="text-sm font-black text-theme-primary">Proyectos</span>
                            <span className="text-[10px] font-bold text-theme-muted bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{projects.length}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? "Expandir" : "Minimizar"}
                        className="p-1.5 rounded-lg hover:bg-olive-100 dark:hover:bg-olive-900/30 text-theme-muted hover:text-olive-600 transition-colors"
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {/* Search */}
                    <div className="px-3 pb-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted pointer-events-none" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar proyecto..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs surface-primary border border-theme-primary rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-olive-400 transition-colors"
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Project list */}
            <div className={`flex-1 overflow-y-auto px-2 py-1 space-y-0.5 ${isCollapsed ? 'hidden' : ''}`}>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-theme-muted" />
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="px-3 py-8 text-center text-[11px] text-theme-muted">
                        <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {searchQuery ? 'No se encontraron proyectos' : 'Sin proyectos'}
                    </div>
                ) : (
                    filteredProjects.map(p => {
                        const pct = p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0;
                        const deptColor = DEPT_COLORS[p.department] ?? 'bg-neutral-400';
                        const isSelected = selectedProjectId === p.id;

                        return (
                            <button
                                key={p.id}
                                onClick={() => onSelectProject(p.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl group transition-all ${isSelected
                                    ? 'bg-neutral-100 dark:bg-neutral-800 ring-1 ring-olive-400/40'
                                    : 'hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${deptColor}`} />
                                    <span className="text-[10px] font-black text-olive-600 dark:text-olive-400 font-mono leading-none truncate">
                                        {p.code}
                                    </span>
                                    {isSelected && (
                                        <ChevronRight className="w-3 h-3 text-olive-600 ml-auto shrink-0" />
                                    )}
                                </div>
                                <p className="text-[11px] font-semibold text-theme-primary leading-snug truncate pl-4" title={p.name}>
                                    {p.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5 pl-4">
                                    {p.clientName && (
                                        <span className="flex items-center gap-0.5 text-[9px] text-theme-muted truncate">
                                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                                            {p.clientName}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-0.5 text-[9px] text-theme-muted ml-auto shrink-0">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {p.year}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Collapsed state indicators */}
            {isCollapsed && selectedProjectId && (
                <div className="flex-1 flex flex-col items-center pt-4 gap-4">
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-10 h-10 rounded-full bg-olive-100 dark:bg-olive-900/30 text-olive-600 flex items-center justify-center hover:scale-105 transition-transform"
                        title="Ver proyecto seleccionado"
                    >
                        <FolderKanban className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
