'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderKanban, ChevronRight, Layers,
    Loader2, Building2, Calendar, Search, PanelLeftClose, PanelLeftOpen
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

const DEPT_LABELS: Record<string, string> = {
    ELECTRICAL: 'Eléctrico',
    CIVIL_DESIGN: 'Civil / Diseño',
    INSTRUMENTATION: 'Instrumentación',
    MECHANICAL: 'Mecánico',
    ADMINISTRATION: 'Administración',
    ENGINEERING: 'Ingeniería',
    ARCHITECTURE: 'Arquitectura',
    IT: 'IT',
    OTHER: 'Otro',
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

            {/* Header */}
            <div className="px-4 pt-5 pb-3 border-b border-theme-primary shrink-0">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-olive-600 shrink-0" />
                            <span className="text-sm font-black text-theme-primary">Proyectos</span>
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
                    <div className="px-3 pt-3 pb-2 shrink-0 border-b border-theme-primary/30">
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


                    <div className="px-2 pt-2 shrink-0">
                        <button
                            onClick={() => onSelectProject(null)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedProjectId === null
                                ? 'bg-olive-600 text-white'
                                : 'text-theme-muted hover:text-theme-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                        >
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            Todos los proyectos
                            <span className="ml-auto text-[10px] opacity-70">{projects.length}</span>
                        </button>
                    </div>

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
                                        {/* Progress bar */}
                                        {p.taskCount > 0 && (
                                            <div className="mt-2 pl-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-olive-500'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] text-theme-muted tabular-nums shrink-0">{pct}%</span>
                                                </div>
                                                <p className="text-[9px] text-theme-muted mt-0.5">
                                                    {p.completedCount}/{p.taskCount} tareas
                                                </p>
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </>
            )}

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
