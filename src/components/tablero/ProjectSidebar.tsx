'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderKanban, Plus, X, ChevronRight, Layers,
    Check, Loader2, Building2, Calendar,
} from 'lucide-react';
import { getProjectsForTablero, createTableroProject } from '@/app/(protected)/tablero/actions';
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
    const role = (session?.user as any)?.role as string;
    const canCreate = ['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(role);

    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    /* form state */
    const [form, setForm] = useState({
        code: '', name: '',
        year: new Date().getFullYear(),
        department: 'OTHER',
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        const data = await getProjectsForTablero();
        setProjects(data as ProjectItem[]);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        const res = await createTableroProject(form) as any;
        setCreating(false);
        if (res?.error) { setError(res.error); return; }
        setShowCreate(false);
        setForm({ code: '', name: '', year: new Date().getFullYear(), department: 'OTHER' });
        await load();
        onProjectCreated();
    };

    return (
        <div className="flex flex-col h-full w-64 shrink-0 border-r border-theme-primary surface-secondary overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-5 pb-3 border-b border-theme-primary shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-olive-600 shrink-0" />
                        <span className="text-sm font-black text-theme-primary">Proyectos</span>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowCreate(v => !v)}
                            title="Nuevo proyecto"
                            className="p-1.5 rounded-lg hover:bg-olive-100 dark:hover:bg-olive-900/30 text-theme-muted hover:text-olive-600 transition-colors"
                        >
                            {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Create form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.form
                        key="create"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-b border-theme-primary"
                        onSubmit={handleCreate}
                    >
                        <div className="p-3 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-theme-muted">Nuevo Proyecto</p>
                            <input
                                value={form.code}
                                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                placeholder="Código (ej: P-25-001)"
                                className="w-full text-xs px-2.5 py-1.5 surface-primary border border-theme-primary rounded-lg focus:outline-none focus:border-olive-400 text-theme-primary placeholder-theme-muted"
                                required
                            />
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Nombre del proyecto"
                                className="w-full text-xs px-2.5 py-1.5 surface-primary border border-theme-primary rounded-lg focus:outline-none focus:border-olive-400 text-theme-primary placeholder-theme-muted"
                                required
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={form.year}
                                    onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                                    className="w-20 text-xs px-2 py-1.5 surface-primary border border-theme-primary rounded-lg focus:outline-none focus:border-olive-400 text-theme-primary"
                                />
                                <select
                                    value={form.department}
                                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                                    className="flex-1 text-xs px-2 py-1.5 surface-primary border border-theme-primary rounded-lg focus:outline-none focus:border-olive-400 text-theme-primary"
                                >
                                    {Object.entries(DEPT_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            {error && <p className="text-[10px] text-red-500">{error}</p>}
                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-olive-600 hover:bg-olive-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Crear
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* All Projects button */}
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
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-theme-muted" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="px-3 py-8 text-center text-[11px] text-theme-muted">
                        <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Sin proyectos
                    </div>
                ) : (
                    projects.map(p => {
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
        </div>
    );
}
