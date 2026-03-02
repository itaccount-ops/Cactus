'use client';

import {
    useState, useEffect, useMemo, useRef, useCallback, Fragment,
} from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, ChevronDown, ChevronUp, Trash2, Check, X,
    User, Layers, LayoutGrid, List, Clock, CheckCircle2,
    XCircle, Circle, RefreshCw, Minus, Eye, AlertTriangle,
    Flag, Calendar as CalendarIcon, SlidersHorizontal,
    ChevronsDownUp, ChevronsUpDown, MessageSquare, Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    getTableroData,
    updateTaskField,
    createTableroTask,
    deleteTableroTask,
} from '@/app/(protected)/tablero/actions';
import TaskDetailsModal from '@/components/tasks/TaskDetailsModal';
import { useRealtimePolling } from '@/hooks/useRealtimePolling';
import { useToast } from '@/components/ui/Toast';

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
type ViewMode = 'table' | 'kanban';
type GroupBy = 'project' | 'status' | 'priority';
type SortField = 'none' | 'title' | 'status' | 'priority' | 'dueDate';
type SortDir = 'asc' | 'desc';
type QuickFilter = 'all' | 'mine' | 'unassigned' | 'overdue';

interface BoardGroup {
    id: string;
    name: string;
    color: string;
    tasks: any[];
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

// Valid status transitions (mirrors server-side state machine)
const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'PENDING', 'CANCELLED'],
    COMPLETED: ['PENDING', 'IN_PROGRESS'],
    CANCELLED: ['PENDING'],
};

const STATUS_OPTIONS = [
    {
        value: 'PENDING',
        label: 'Pendiente',
        solidBg: 'bg-neutral-400',
        solidText: 'text-white',
        softBg: 'bg-neutral-100 dark:bg-neutral-800',
        softText: 'text-neutral-600 dark:text-neutral-300',
        dot: 'bg-neutral-400',
        hex: '#a3a3a3',
    },
    {
        value: 'IN_PROGRESS',
        label: 'En curso',
        solidBg: 'bg-blue-500',
        solidText: 'text-white',
        softBg: 'bg-blue-100 dark:bg-blue-900/50',
        softText: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
        hex: '#3b82f6',
    },
    {
        value: 'COMPLETED',
        label: 'Completado',
        solidBg: 'bg-green-500',
        solidText: 'text-white',
        softBg: 'bg-green-100 dark:bg-green-900/50',
        softText: 'text-green-700 dark:text-green-300',
        dot: 'bg-green-500',
        hex: '#10b981',
    },
    {
        value: 'CANCELLED',
        label: 'Cancelado',
        solidBg: 'bg-red-400',
        solidText: 'text-white',
        softBg: 'bg-red-100 dark:bg-red-900/50',
        softText: 'text-red-600 dark:text-red-300',
        dot: 'bg-red-400',
        hex: '#f87171',
    },
] as const;

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Baja', hex: '#a3a3a3', bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-500 dark:text-neutral-400' },
    { value: 'MEDIUM', label: 'Media', hex: '#f59e0b', bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300' },
    { value: 'HIGH', label: 'Alta', hex: '#f97316', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
    { value: 'URGENT', label: 'Urgente', hex: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
] as const;

const GROUP_COLORS = [
    '#6366f1', '#8b5cf6', '#f59e0b', '#10b981',
    '#3b82f6', '#ec4899', '#f97316', '#14b8a6',
    '#ef4444', '#84cc16', '#a78bfa', '#fb923c',
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function getStatusCfg(v: string) {
    return STATUS_OPTIONS.find(s => s.value === v) ?? STATUS_OPTIONS[0];
}
function getPriorityCfg(v: string) {
    return PRIORITY_OPTIONS.find(p => p.value === v) ?? PRIORITY_OPTIONS[1];
}
function fmtDate(d: any): string {
    if (!d) return '—';
    try { return format(new Date(d), 'd MMM', { locale: es }); }
    catch { return '—'; }
}
function fmtDateInput(d: any): string {
    if (!d) return '';
    try { return format(new Date(d), 'yyyy-MM-dd'); }
    catch { return ''; }
}
function isOverdue(t: any): boolean {
    if (!t.dueDate) return false;
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
    return new Date(t.dueDate) < new Date();
}
function highlight(text: string, term: string): React.ReactNode {
    if (!term.trim()) return text;
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i === -1) return text;
    return (
        <>
            {text.slice(0, i)}
            <mark className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded-sm not-italic px-0.5">
                {text.slice(i, i + term.length)}
            </mark>
            {text.slice(i + term.length)}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════════════════════ */

/** Stacked avatar(s). Shows up to 3 + overflow count. */
function AvatarStack({ users, size = 'sm' }: { users: any[]; size?: 'sm' | 'xs' }) {
    const visible = users.slice(0, 3);
    const extra = users.length - 3;
    const sz = size === 'xs' ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[10px]';

    if (!users.length) {
        return (
            <div className={`${sz} rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center`}>
                <User className="w-3 h-3 text-neutral-400" />
            </div>
        );
    }
    return (
        <div className="flex items-center -space-x-1.5">
            {visible.map((u, i) => (
                u?.image ? (
                    <img
                        key={u.id ?? i}
                        src={u.image}
                        alt={u.name}
                        className={`${sz} rounded-full object-cover border-2 border-white dark:border-neutral-900 shrink-0`}
                        style={{ zIndex: visible.length - i }}
                    />
                ) : (
                    <div
                        key={u?.id ?? i}
                        className={`${sz} rounded-full bg-olive-100 dark:bg-olive-900/60 flex items-center justify-center font-bold text-olive-700 dark:text-olive-300 border-2 border-white dark:border-neutral-900 shrink-0`}
                        style={{ zIndex: visible.length - i }}
                    >
                        {u?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                )
            ))}
            {extra > 0 && (
                <div
                    className={`${sz} rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-500 border-2 border-white dark:border-neutral-900`}
                >
                    +{extra}
                </div>
            )}
        </div>
    );
}

/** Colored label pills */
function LabelDots({ labels }: { labels: any[] }) {
    if (!labels?.length) return null;
    return (
        <div className="flex items-center gap-0.5 flex-wrap">
            {labels.slice(0, 4).map((l: any) => (
                <span
                    key={l.id}
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: l.color ?? '#a3a3a3' }}
                    title={l.name}
                />
            ))}
            {labels.length > 4 && (
                <span className="text-[9px] text-theme-muted">+{labels.length - 4}</span>
            )}
        </div>
    );
}

/** Mini checklist progress bar */
function ChecklistProgress({ items }: { items: any[] }) {
    if (!items?.length) return null;
    const done = items.filter((i: any) => i.completed).length;
    const pct = Math.round((done / items.length) * 100);
    return (
        <div className="flex items-center gap-1.5" title={`${done}/${items.length} completadas`}>
            <div className="w-12 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[9px] text-theme-muted tabular-nums">{pct}%</span>
        </div>
    );
}

/** Hook: close dropdown on outside click */
function useDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        function h(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return { open, setOpen, ref };
}

/* ── StatusPill ─────────────────────────────────────────────── */
function StatusPill({
    status, taskId, onUpdate, busy,
}: {
    status: string; taskId: string;
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    busy: boolean;
}) {
    const { open, setOpen, ref } = useDropdown();
    const cfg = getStatusCfg(status);
    const valid = VALID_TRANSITIONS[status] ?? [];

    return (
        <div className="relative" ref={ref}>
            <button
                disabled={busy}
                onClick={e => { e.stopPropagation(); setOpen(!open); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all select-none ${busy ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-85'} ${cfg.solidBg} ${cfg.solidText}`}
            >
                {busy
                    ? <span className="w-2 h-2 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <span className={`w-1.5 h-1.5 rounded-full bg-white/40 shrink-0`} />
                }
                {cfg.label}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-[100] top-full mt-1.5 left-0 surface-secondary border border-theme-primary rounded-xl shadow-xl py-1.5 min-w-[160px]"
                    >
                        <p className="px-3 pb-1 text-[9px] font-black text-theme-muted uppercase tracking-widest">
                            Cambiar a
                        </p>
                        {STATUS_OPTIONS.map(opt => {
                            const isCurrent = opt.value === status;
                            const isAllowed = isCurrent || valid.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    disabled={!isAllowed}
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (!isCurrent && isAllowed) {
                                            onUpdate(taskId, 'status', opt.value);
                                        }
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${isAllowed
                                        ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer'
                                        : 'opacity-35 cursor-not-allowed'
                                        }`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${opt.solidBg}`} />
                                    <span className={`flex-1 text-left ${isCurrent ? 'font-bold text-theme-primary' : 'text-theme-secondary'}`}>
                                        {opt.label}
                                    </span>
                                    {isCurrent && <Check className="w-3 h-3 text-olive-600 shrink-0" />}
                                    {!isAllowed && !isCurrent && (
                                        <span className="text-[9px] text-theme-muted">bloqueado</span>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── PriorityPill ───────────────────────────────────────────── */
function PriorityPill({
    priority, taskId, onUpdate, busy,
}: {
    priority: string; taskId: string;
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    busy: boolean;
}) {
    const { open, setOpen, ref } = useDropdown();
    const cfg = getPriorityCfg(priority);

    return (
        <div className="relative" ref={ref}>
            <button
                disabled={busy}
                onClick={e => { e.stopPropagation(); setOpen(!open); }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${busy ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'} ${cfg.bg} ${cfg.text}`}
            >
                <Flag className="w-2.5 h-2.5 shrink-0" style={{ color: cfg.hex }} />
                {cfg.label}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-[100] top-full mt-1.5 left-0 surface-secondary border border-theme-primary rounded-xl shadow-xl py-1.5 min-w-[140px]"
                    >
                        {PRIORITY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={e => {
                                    e.stopPropagation();
                                    onUpdate(taskId, 'priority', opt.value);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <Flag className="w-3 h-3 shrink-0" style={{ color: opt.hex }} />
                                <span className={`flex-1 text-left ${priority === opt.value ? 'font-bold text-theme-primary' : 'text-theme-secondary'}`}>
                                    {opt.label}
                                </span>
                                {priority === opt.value && <Check className="w-3 h-3 text-olive-600 shrink-0" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── AssigneeCell ───────────────────────────────────────────── */
function AssigneeCell({
    task, users, onUpdate, busy,
}: {
    task: any; users: any[];
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    busy: boolean;
}) {
    const { open, setOpen, ref } = useDropdown();
    const [search, setSearch] = useState('');
    const assignees = task.assignees?.length ? task.assignees : (task.assignedTo ? [task.assignedTo] : []);
    const primaryId = task.assignees?.[0]?.id ?? task.assignedTo?.id ?? null;
    const filteredUsers = users.filter(u =>
        !search || u.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={ref}>
            <button
                disabled={busy}
                onClick={e => { e.stopPropagation(); setOpen(!open); }}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
                <AvatarStack users={assignees} />
                {!assignees.length && <span className="text-xs text-theme-muted">—</span>}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-[100] top-full mt-1.5 left-0 surface-secondary border border-theme-primary rounded-xl shadow-xl py-1.5 min-w-[190px]"
                    >
                        {/* Search */}
                        <div className="px-2 pb-1.5">
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar persona..."
                                onClick={e => e.stopPropagation()}
                                className="w-full text-xs px-2 py-1 surface-secondary border border-theme-primary rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-olive-400"
                            />
                        </div>
                        {/* Unassign option */}
                        <button
                            onClick={e => { e.stopPropagation(); onUpdate(task.id, 'assignedToId', null); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-theme-muted"
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center">
                                <Minus className="w-2.5 h-2.5" />
                            </div>
                            Sin asignar
                        </button>
                        {/* User list */}
                        <div className="max-h-44 overflow-y-auto">
                            {filteredUsers.map(u => (
                                <button
                                    key={u.id}
                                    onClick={e => { e.stopPropagation(); onUpdate(task.id, 'assignedToId', u.id); setOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    {u.image
                                        ? <img src={u.image} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                        : <div className="w-5 h-5 rounded-full bg-olive-100 dark:bg-olive-900/50 flex items-center justify-center font-bold text-olive-700 dark:text-olive-300 text-[9px] shrink-0">{u.name?.[0]?.toUpperCase()}</div>
                                    }
                                    <span className={`flex-1 text-left truncate ${primaryId === u.id ? 'font-bold text-theme-primary' : 'text-theme-secondary'}`}>{u.name}</span>
                                    {primaryId === u.id && <Check className="w-3 h-3 text-olive-600 shrink-0" />}
                                </button>
                            ))}
                            {filteredUsers.length === 0 && (
                                <p className="px-3 py-2 text-xs text-theme-muted text-center">Sin resultados</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── DateCell ───────────────────────────────────────────────── */
function DateCell({
    task, onUpdate, busy,
}: {
    task: any;
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    busy: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const overdue = isOverdue(task);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="date"
                defaultValue={fmtDateInput(task.dueDate)}
                className="text-xs surface-secondary border border-olive-400 rounded-lg px-1.5 py-0.5 w-28 text-theme-primary focus:outline-none"
                onBlur={e => { onUpdate(task.id, 'dueDate', e.target.value || null); setEditing(false); }}
                onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditing(false);
                }}
                onClick={e => e.stopPropagation()}
            />
        );
    }
    return (
        <button
            disabled={busy}
            onClick={e => { e.stopPropagation(); setEditing(true); }}
            className={`flex items-center gap-1 text-xs transition-opacity hover:opacity-70 ${overdue ? 'text-red-500 font-semibold' : 'text-theme-muted'}`}
        >
            {overdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
            <CalendarIcon className={`w-3 h-3 shrink-0 ${overdue ? 'text-red-400' : 'text-theme-muted/50'}`} />
            {task.dueDate ? fmtDate(task.dueDate) : <span className="text-theme-muted/40">—</span>}
        </button>
    );
}

/* ── TitleCell ──────────────────────────────────────────────── */
function TitleCell({
    task, search, onUpdate, onOpen, busy,
}: {
    task: any; search: string;
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    onOpen: () => void;
    busy: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(task.title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setValue(task.title); }, [task.title]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const save = async () => {
        const t = value.trim();
        if (t && t !== task.title) await onUpdate(task.id, 'title', t);
        else setValue(task.title);
        setEditing(false);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={e => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') { setValue(task.title); setEditing(false); }
                }}
                onClick={e => e.stopPropagation()}
                className="text-sm font-medium bg-transparent border-b border-olive-400 outline-none text-theme-primary w-full py-0.5"
            />
        );
    }

    return (
        <div className="flex items-start gap-2 min-w-0">
            {/* Status dot indicator (left of title) */}
            <span
                className={`mt-1 w-2 h-2 rounded-full shrink-0 ${getStatusCfg(task.status).dot}`}
            />
            <div className="min-w-0 flex-1">
                <p
                    className={`text-sm font-medium text-theme-primary truncate cursor-pointer hover:text-olive-700 dark:hover:text-olive-400 transition-colors ${task.status === 'COMPLETED' ? 'line-through opacity-50' : ''
                        }`}
                    onClick={e => { e.stopPropagation(); onOpen(); }}
                    onDoubleClick={e => { e.stopPropagation(); if (!busy) setEditing(true); }}
                    title="Clic para abrir · Doble clic para editar"
                >
                    {highlight(task.title, search)}
                </p>
                {/* Sub-info row */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <LabelDots labels={task.labels} />
                    {(task._count?.comments ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-theme-muted">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {task._count.comments}
                        </span>
                    )}
                    {(task._count?.attachments ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-theme-muted">
                            <Paperclip className="w-2.5 h-2.5" />
                            {task._count.attachments}
                        </span>
                    )}
                    <ChecklistProgress items={task.checklistItems ?? []} />
                </div>
            </div>
        </div>
    );
}

/* ── TaskRow ────────────────────────────────────────────────── */
function TaskRow({
    task, users, search, onUpdate, onDelete, onOpen, isLast, busy,
}: {
    task: any; users: any[]; search: string;
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onOpen: (t: any) => void;
    isLast: boolean; busy: boolean;
}) {
    const [hover, setHover] = useState(false);

    return (
        <tr
            className={`group transition-colors ${hover ? 'bg-olive-50/40 dark:bg-olive-900/10' : ''} ${!isLast ? 'border-b border-theme-primary/20' : ''} ${busy ? 'opacity-70' : ''}`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {/* Title */}
            <td className="px-3 py-2 min-w-0">
                <TitleCell task={task} search={search} onUpdate={onUpdate} onOpen={() => onOpen(task)} busy={busy} />
            </td>
            {/* Status */}
            <td className="px-2 py-2 w-[140px]">
                <StatusPill status={task.status} taskId={task.id} onUpdate={onUpdate} busy={busy} />
            </td>
            {/* Priority */}
            <td className="px-2 py-2 w-[110px]">
                <PriorityPill priority={task.priority} taskId={task.id} onUpdate={onUpdate} busy={busy} />
            </td>
            {/* Assignee */}
            <td className="px-2 py-2 w-[110px]">
                <AssigneeCell task={task} users={users} onUpdate={onUpdate} busy={busy} />
            </td>
            {/* Due date */}
            <td className="px-2 py-2 w-[90px]">
                <DateCell task={task} onUpdate={onUpdate} busy={busy} />
            </td>
            {/* Project tag (hidden in project-group mode, shown in other group modes) */}
            <td className="px-2 py-2 w-[100px] hidden xl:table-cell">
                {task.project && (
                    <span className="text-[10px] text-theme-muted bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full truncate max-w-full block">
                        {task.project.code}
                    </span>
                )}
            </td>
            {/* Actions */}
            <td className="px-2 py-2 w-[60px]">
                <div className={`flex items-center gap-0.5 transition-opacity ${hover ? 'opacity-100' : 'opacity-0'}`}>
                    <button
                        onClick={e => { e.stopPropagation(); onOpen(task); }}
                        className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted hover:text-theme-primary transition-colors"
                        title="Ver detalles"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                        disabled={busy}
                        onClick={e => { e.stopPropagation(); onDelete(task.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-theme-muted hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ── AddTaskRow ─────────────────────────────────────────────── */
function AddTaskRow({ groupId, groupStatus, onAdd }: {
    groupId: string | null;
    groupStatus?: string;
    onAdd: (title: string, projectId: string | null, status?: string) => Promise<void>;
}) {
    const [active, setActive] = useState(false);
    const [title, setTitle] = useState('');
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => { if (active) ref.current?.focus(); }, [active]);

    const submit = async () => {
        const t = title.trim();
        if (t) { await onAdd(t, groupId, groupStatus); setTitle(''); }
        setActive(false);
    };

    if (!active) {
        return (
            <tr>
                <td colSpan={7} className="px-3 py-2">
                    <button
                        onClick={() => setActive(true)}
                        className="flex items-center gap-1.5 text-xs text-theme-muted hover:text-olive-600 dark:hover:text-olive-400 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar tarea
                    </button>
                </td>
            </tr>
        );
    }
    return (
        <tr className="bg-olive-50/30 dark:bg-olive-900/10">
            <td colSpan={7} className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <input
                        ref={ref}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') submit();
                            if (e.key === 'Escape') { setTitle(''); setActive(false); }
                        }}
                        placeholder="Nombre de la tarea… Enter para guardar, Esc para cancelar"
                        className="flex-1 text-sm bg-transparent border-b border-olive-400 outline-none text-theme-primary placeholder-theme-muted py-0.5"
                    />
                    <button onClick={submit} className="p-1 rounded-lg bg-olive-600 text-white hover:bg-olive-700 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setTitle(''); setActive(false); }} className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ── BoardGroup ─────────────────────────────────────────────── */
function BoardGroup({
    group, colorIndex, users, search, onUpdate, onDelete, onAdd, onOpen,
    isCollapsed, onToggleCollapse, updatingTasks, sortField, sortDir, onSort,
}: {
    group: BoardGroup; colorIndex: number; users: any[]; search: string;
    onUpdate: (id: string, f: string, v: any) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAdd: (title: string, projectId: string | null, status?: string) => Promise<void>;
    onOpen: (t: any) => void;
    isCollapsed: boolean; onToggleCollapse: () => void;
    updatingTasks: Set<string>;
    sortField: SortField; sortDir: SortDir;
    onSort: (f: SortField) => void;
}) {
    const color = GROUP_COLORS[colorIndex % GROUP_COLORS.length];
    const completed = group.tasks.filter(t => t.status === 'COMPLETED').length;
    const pct = group.tasks.length > 0
        ? Math.round((completed / group.tasks.length) * 100) : 0;

    // Sort tasks
    const sorted = useMemo(() => {
        if (sortField === 'none') return group.tasks;
        return [...group.tasks].sort((a, b) => {
            let va: any, vb: any;
            if (sortField === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
            if (sortField === 'status') { va = a.status; vb = b.status; }
            if (sortField === 'priority') {
                const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as Record<string, number>;
                va = order[a.priority] ?? 99; vb = order[b.priority] ?? 99;
            }
            if (sortField === 'dueDate') {
                va = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                vb = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [group.tasks, sortField, sortDir]);

    const SortBtn = ({ field, label }: { field: SortField; label: string }) => {
        const active = sortField === field;
        return (
            <button
                onClick={() => onSort(field)}
                className={`flex items-center gap-1 text-left w-full group/hdr transition-colors ${active ? 'text-olive-600 dark:text-olive-400' : 'text-theme-muted hover:text-theme-primary'}`}
            >
                {label}
                {active
                    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />)
                    : <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-0 group-hover/hdr:opacity-60" />
                }
            </button>
        );
    };

    return (
        <div className="mb-4">
            {/* Group header */}
            <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-t-xl cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors select-none"
                style={{ borderLeft: `4px solid ${color}` }}
                onClick={onToggleCollapse}
            >
                <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown className="w-4 h-4 text-theme-muted shrink-0" />
                </motion.div>
                <span className="font-black text-sm" style={{ color }}>{group.name}</span>
                <span className="text-[11px] text-theme-muted bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full tabular-nums">
                    {group.tasks.length}
                </span>
                {/* Progress bar */}
                {group.tasks.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-1">
                        <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-olive-500'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-theme-muted tabular-nums">{pct}%</span>
                    </div>
                )}
                {completed > 0 && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5 ml-auto">
                        <CheckCircle2 className="w-3 h-3" />
                        {completed}/{group.tasks.length}
                    </span>
                )}
            </div>

            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        key="body"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div
                            className="border border-theme-primary border-t-0 rounded-b-xl overflow-hidden"
                            style={{ borderLeft: `4px solid ${color}` }}
                        >
                            <table className="w-full table-fixed">
                                <thead>
                                    <tr className="border-b border-theme-primary/30 bg-neutral-50/60 dark:bg-neutral-900/30">
                                        <th className="px-3 py-2 text-left">
                                            <SortBtn field="title" label="Tarea" />
                                        </th>
                                        <th className="px-2 py-2 w-[140px] text-left">
                                            <SortBtn field="status" label="Estado" />
                                        </th>
                                        <th className="px-2 py-2 w-[110px] text-left">
                                            <SortBtn field="priority" label="Prioridad" />
                                        </th>
                                        <th className="px-2 py-2 w-[110px] text-left">
                                            <span className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Asignado</span>
                                        </th>
                                        <th className="px-2 py-2 w-[90px] text-left">
                                            <SortBtn field="dueDate" label="Vence" />
                                        </th>
                                        <th className="px-2 py-2 w-[100px] hidden xl:table-cell" />
                                        <th className="px-2 py-2 w-[60px]" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((task, i) => (
                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            users={users}
                                            search={search}
                                            onUpdate={onUpdate}
                                            onDelete={onDelete}
                                            onOpen={onOpen}
                                            isLast={i === sorted.length - 1}
                                            busy={updatingTasks.has(task.id)}
                                        />
                                    ))}
                                    <AddTaskRow
                                        groupId={group.id === '__none__' ? null : group.id}
                                        onAdd={onAdd}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── KanbanCard ─────────────────────────────────────────────── */
function KanbanCard({
    task, onOpen, onDragStart, isDragging,
}: {
    task: any; onOpen: (t: any) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    isDragging: boolean;
}) {
    const pri = getPriorityCfg(task.priority);
    const assignees = task.assignees?.length ? task.assignees : (task.assignedTo ? [task.assignedTo] : []);
    const overdue = isOverdue(task);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
        >
            {/* Native div for HTML5 drag (avoids framer-motion type conflict) */}
            <div
                draggable
                onDragStart={e => onDragStart(e as unknown as React.DragEvent<HTMLDivElement>, task.id)}
                className="surface-secondary border border-theme-primary rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-olive-300 dark:hover:border-olive-700 transition-all select-none"
                onClick={() => onOpen(task)}
            >
                {/* Labels */}
                {task.labels?.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                        {task.labels.slice(0, 5).map((l: any) => (
                            <span
                                key={l.id}
                                className="inline-block h-1.5 w-6 rounded-full"
                                style={{ backgroundColor: l.color }}
                            />
                        ))}
                    </div>
                )}
                {/* Title */}
                <p className={`text-sm font-medium text-theme-primary leading-snug mb-2 ${task.status === 'COMPLETED' ? 'line-through opacity-50' : ''}`}>
                    {task.title}
                </p>
                {/* Footer */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${pri.bg} ${pri.text}`}>
                            <Flag className="w-2 h-2" style={{ color: pri.hex }} />
                            {pri.label}
                        </span>
                        {/* Checklist progress */}
                        {(task.checklistItems?.length ?? 0) > 0 && (
                            <span className="text-[9px] text-theme-muted">
                                {task.checklistItems.filter((i: any) => i.completed).length}/{task.checklistItems.length}✓
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Due date */}
                        {task.dueDate && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? 'text-red-500 font-semibold' : 'text-theme-muted'}`}>
                                {overdue && <AlertTriangle className="w-2.5 h-2.5" />}
                                {fmtDate(task.dueDate)}
                            </span>
                        )}
                        {/* Comments */}
                        {(task._count?.comments ?? 0) > 0 && (
                            <span className="text-[9px] text-theme-muted flex items-center gap-0.5">
                                <MessageSquare className="w-2.5 h-2.5" />
                                {task._count.comments}
                            </span>
                        )}
                        <AvatarStack users={assignees} size="xs" />
                    </div>
                </div>
                {/* Project tag */}
                {task.project && (
                    <div className="mt-2 pt-2 border-t border-theme-primary/20">
                        <span className="text-[9px] text-theme-muted">{task.project.code} · {task.project.name}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ── KanbanColumn ───────────────────────────────────────────── */
function KanbanColumn({
    status, tasks, onOpen, draggingId, onDragStart, onDragEnd, onDrop, onAdd,
}: {
    status: typeof STATUS_OPTIONS[number];
    tasks: any[]; onOpen: (t: any) => void;
    draggingId: string | null;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, newStatus: string) => void;
    onAdd: (title: string, projectId: null, status: string) => Promise<void>;
}) {
    const [dragOver, setDragOver] = useState(false);
    const [addActive, setAddActive] = useState(false);
    const [addTitle, setAddTitle] = useState('');
    const addRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (addActive) addRef.current?.focus(); }, [addActive]);

    const submitAdd = async () => {
        const t = addTitle.trim();
        if (t) { await onAdd(t, null, status.value); setAddTitle(''); }
        setAddActive(false);
    };

    return (
        <div className="flex flex-col min-w-[260px] max-w-[300px] flex-1">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`w-3 h-3 rounded-sm shrink-0 ${status.solidBg}`} />
                <span className="text-sm font-bold text-theme-primary">{status.label}</span>
                <span className="ml-auto text-xs text-theme-muted bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full tabular-nums">
                    {tasks.length}
                </span>
            </div>

            {/* Drop zone */}
            <div
                className={`flex-1 flex flex-col gap-2 min-h-[100px] rounded-xl transition-all p-1 ${dragOver ? 'bg-olive-50 dark:bg-olive-900/20 ring-2 ring-olive-400 ring-dashed' : ''
                    }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { setDragOver(false); onDrop(e, status.value); }}
            >
                <AnimatePresence>
                    {tasks.map(task => (
                        <KanbanCard
                            key={task.id}
                            task={task}
                            onOpen={onOpen}
                            onDragStart={onDragStart}
                            isDragging={draggingId === task.id}
                        />
                    ))}
                </AnimatePresence>

                {tasks.length === 0 && !dragOver && (
                    <div className="flex-1 border-2 border-dashed border-theme-primary/20 rounded-xl flex flex-col items-center justify-center py-8 gap-2 opacity-50">
                        <span className={`w-3 h-3 rounded-sm ${status.solidBg} opacity-40`} />
                        <p className="text-[11px] text-theme-muted">Arrastra aquí</p>
                    </div>
                )}

                {/* Add task inline */}
                {addActive ? (
                    <div className={`p-2 rounded-xl border border-olive-400 surface-secondary`}>
                        <input
                            ref={addRef}
                            value={addTitle}
                            onChange={e => setAddTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') submitAdd();
                                if (e.key === 'Escape') { setAddTitle(''); setAddActive(false); }
                            }}
                            placeholder="Nombre de la tarea…"
                            className="w-full text-sm bg-transparent outline-none text-theme-primary placeholder-theme-muted mb-2"
                        />
                        <div className="flex gap-1">
                            <button onClick={submitAdd} className="px-2 py-1 text-xs bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors">
                                Agregar
                            </button>
                            <button onClick={() => { setAddTitle(''); setAddActive(false); }} className="px-2 py-1 text-xs text-theme-muted hover:text-theme-primary transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setAddActive(true)}
                        className="flex items-center gap-1.5 text-xs text-theme-muted hover:text-olive-600 transition-colors px-1 py-1"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── StatChip ───────────────────────────────────────────────── */
function StatChip({ label, value, color, dot }: { label: string; value: number; color: string; dot?: string }) {
    return (
        <div className="flex items-center gap-1.5 text-xs">
            {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />}
            <span className={`font-black tabular-nums ${color}`}>{value}</span>
            <span className="text-theme-muted">{label}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function MondayBoard({ filterProjectId = null }: { filterProjectId?: string | null }) {
    const { data: session } = useSession();
    const toast = useToast();

    /* ── Core state ── */
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [groupBy, setGroupBy] = useState<GroupBy>('project');
    const [tasks, setTasks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /* ── Filter / sort state ── */
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [sortField, setSortField] = useState<SortField>('none');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    /* ── UI state ── */
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    /* ── Kanban DnD state ── */
    const [draggingId, setDraggingId] = useState<string | null>(null);

    /* ── Data loading ── */
    const loadData = useCallback(async (silent = false) => {
        try {
            const { tasks: t, users: u } = await getTableroData();
            setTasks(t as any[]);
            setUsers(u as any[]);
        } catch {
            if (!silent) toast.error('Error', 'No se pudieron cargar los datos del tablero');
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadData(); }, [loadData]);
    useRealtimePolling({ onPoll: () => loadData(true), interval: 8000, enabled: true });

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    /* ── Sort toggle ── */
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDir === 'asc') setSortDir('desc');
            else { setSortField('none'); setSortDir('asc'); }
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    /* ── Optimistic update with rollback ── */
    const handleUpdate = async (taskId: string, field: string, value: any) => {
        // Save snapshot for rollback
        const prev = tasks.find(t => t.id === taskId);

        // Optimistic update
        setTasks(prev_tasks =>
            prev_tasks.map(t => {
                if (t.id !== taskId) return t;
                if (field === 'assignedToId') {
                    const user = users.find(u => u.id === value) ?? null;
                    const newAssignees = user
                        ? (t.assignees?.some((a: any) => a.id === value)
                            ? t.assignees
                            : [...(t.assignees ?? []), user])
                        : t.assignees?.filter((a: any) => a.id !== t.assignedToId) ?? [];
                    return { ...t, assignedToId: value, assignedTo: user, assignees: newAssignees };
                }
                if (field === 'status' && value === 'COMPLETED') {
                    return { ...t, [field]: value, completedAt: new Date().toISOString() };
                }
                return { ...t, [field]: value };
            })
        );
        setUpdatingTasks(s => new Set([...s, taskId]));

        const res = await updateTaskField(taskId, field, value);

        setUpdatingTasks(s => { const n = new Set(s); n.delete(taskId); return n; });

        if ((res as any)?.error) {
            // Rollback
            if (prev) setTasks(cur => cur.map(t => t.id === taskId ? prev : t));
            toast.error('Error al actualizar', (res as any).error);
        } else {
            // Re-sync to get server truth (labels, counts, etc.)
            await loadData(true);
        }
    };

    /* ── Delete with optimistic remove ── */
    const handleDelete = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setUpdatingTasks(s => new Set([...s, taskId]));

        const res = await deleteTableroTask(taskId);

        setUpdatingTasks(s => { const n = new Set(s); n.delete(taskId); return n; });

        if ((res as any)?.error) {
            if (task) setTasks(prev => [...prev, task]);
            toast.error('Error al eliminar', (res as any).error);
        } else {
            toast.success('Tarea eliminada', `"${task?.title}" ha sido eliminada`);
        }
    };

    /* ── Create task ── */
    const handleAdd = async (title: string, projectId: string | null, status?: string) => {
        const res = await createTableroTask({
            title,
            projectId: projectId ?? undefined,
            status: status ?? undefined,
        });
        if ((res as any)?.error) {
            toast.error('Error al crear', (res as any).error);
        } else {
            toast.success('Tarea creada', `"${title}" añadida al tablero`);
            await loadData(true);
        }
    };

    /* ── Kanban DnD ── */
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggingId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('taskId', taskId);
    };
    const handleDragEnd = () => setDraggingId(null);
    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        setDraggingId(null);
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;
        await handleUpdate(taskId, 'status', newStatus);
    };

    /* ── Build groups ── */
    const allGroups = useMemo((): BoardGroup[] => {
        const map = new Map<string, BoardGroup>();

        const addToGroup = (key: string, name: string, color: string, task: any) => {
            if (!map.has(key)) map.set(key, { id: key, name, color, tasks: [] });
            map.get(key)!.tasks.push(task);
        };

        for (const task of tasks) {
            if (groupBy === 'project') {
                const key = task.project?.id ?? '__none__';
                const name = task.project?.name ?? 'Sin Proyecto';
                const idx = [...map.keys()].indexOf(key);
                const color = GROUP_COLORS[(idx === -1 ? map.size : idx) % GROUP_COLORS.length];
                addToGroup(key, name, color, task);
            } else if (groupBy === 'status') {
                const cfg = getStatusCfg(task.status);
                addToGroup(task.status, cfg.label, cfg.hex, task);
            } else {
                const cfg = getPriorityCfg(task.priority);
                addToGroup(task.priority, cfg.label, cfg.hex, task);
            }
        }

        // For project grouping: put "Sin Proyecto" last
        if (groupBy === 'project') {
            const groups = Array.from(map.values());
            const noProj = groups.findIndex(g => g.id === '__none__');
            if (noProj > 0) groups.push(groups.splice(noProj, 1)[0]);
            return groups;
        }

        // For status: maintain STATUS_OPTIONS order
        if (groupBy === 'status') {
            return STATUS_OPTIONS
                .map(s => map.get(s.value))
                .filter(Boolean) as BoardGroup[];
        }

        // For priority: maintain PRIORITY_OPTIONS order (urgent first)
        return ['URGENT', 'HIGH', 'MEDIUM', 'LOW']
            .map(p => map.get(p))
            .filter(Boolean) as BoardGroup[];
    }, [tasks, groupBy]);

    /* ── Apply project filter + quick filter + search + status + priority ── */
    const filteredGroups = useMemo(() => {
        const userId = session?.user?.id;
        return allGroups
            .map(g => ({
                ...g,
                tasks: g.tasks.filter(t => {
                    // Project sidebar filter
                    if (filterProjectId && t.project?.id !== filterProjectId) return false;
                    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
                    if (filterStatus && t.status !== filterStatus) return false;
                    if (filterPriority && t.priority !== filterPriority) return false;
                    if (quickFilter === 'mine' && userId) {
                        const isAssigned = t.assignees?.some((a: any) => a.id === userId) || t.assignedToId === userId;
                        if (!isAssigned) return false;
                    }
                    if (quickFilter === 'unassigned') {
                        if (t.assignedToId || t.assignees?.length) return false;
                    }
                    if (quickFilter === 'overdue' && !isOverdue(t)) return false;
                    return true;
                }),
            }))
            .filter(g => g.tasks.length > 0);
    }, [allGroups, search, filterStatus, filterPriority, quickFilter, session?.user?.id, filterProjectId]);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        overdue: tasks.filter(t => isOverdue(t)).length,
    }), [tasks]);

    /* ── Kanban view tasks ── */
    const kanbanCols = useMemo(() => {
        const filtered = tasks.filter(t => {
            if (filterProjectId && t.project?.id !== filterProjectId) return false;
            if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterPriority && t.priority !== filterPriority) return false;
            const uid = session?.user?.id;
            if (quickFilter === 'mine' && uid && !t.assignees?.some((a: any) => a.id === uid) && t.assignedToId !== uid) return false;
            if (quickFilter === 'unassigned' && (t.assignedToId || t.assignees?.length)) return false;
            if (quickFilter === 'overdue' && !isOverdue(t)) return false;
            return true;
        });
        return STATUS_OPTIONS.map(s => ({ ...s, tasks: filtered.filter(t => t.status === s.value) }));
    }, [tasks, search, filterPriority, quickFilter, session?.user?.id, filterProjectId]);

    /* ── Group collapse helpers ── */
    const toggleCollapse = (id: string) => {
        setCollapsedGroups(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };
    const collapseAll = () => setCollapsedGroups(new Set(allGroups.map(g => g.id)));
    const expandAll = () => setCollapsedGroups(new Set());

    const hasFilters = !!(search || filterStatus || filterPriority || quickFilter !== 'all');

    /* ════════════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════════════ */
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-olive-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-theme-muted">Cargando tablero…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">

            {/* ── HEADER ── */}
            <div className="px-6 pt-5 pb-3 border-b border-theme-primary shrink-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <h1 className="text-xl font-black text-theme-primary flex items-center gap-2">
                            <Layers className="w-5 h-5 text-olive-600 shrink-0" />
                            Monday
                        </h1>
                        <p className="text-xs text-theme-muted mt-0.5">
                            Vista general · {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en {allGroups.length} grupo{allGroups.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {/* View toggle */}
                        <div className="flex items-center surface-secondary border border-theme-primary rounded-xl p-1 gap-0.5">
                            {([['table', List, 'Tabla'], ['kanban', LayoutGrid, 'Kanban']] as const).map(([m, Icon, label]) => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m as ViewMode)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === m ? 'bg-olive-600 text-white shadow-sm' : 'text-theme-muted hover:text-theme-primary'}`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Group by (table only) */}
                        {viewMode === 'table' && (
                            <div className="flex items-center surface-secondary border border-theme-primary rounded-xl p-1 gap-0.5">
                                {(['project', 'status', 'priority'] as GroupBy[]).map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setGroupBy(g)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${groupBy === g ? 'bg-neutral-200 dark:bg-neutral-700 text-theme-primary' : 'text-theme-muted hover:text-theme-primary'}`}
                                    >
                                        {g === 'project' ? 'Proyecto' : g === 'status' ? 'Estado' : 'Prioridad'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Refresh */}
                        <button
                            onClick={handleRefresh}
                            title="Actualizar datos"
                            className="p-2 rounded-xl border border-theme-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 text-theme-muted transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Stats chips */}
                <div className="flex items-center gap-4 flex-wrap">
                    <StatChip label="total" value={stats.total} color="text-theme-primary" />
                    <StatChip label="pendientes" value={stats.pending} color="text-neutral-500 dark:text-neutral-400" dot="bg-neutral-400" />
                    <StatChip label="en curso" value={stats.inProgress} color="text-blue-600 dark:text-blue-400" dot="bg-blue-500" />
                    <StatChip label="completadas" value={stats.completed} color="text-green-600 dark:text-green-400" dot="bg-green-500" />
                    {stats.overdue > 0 && (
                        <StatChip label="vencidas" value={stats.overdue} color="text-red-600 dark:text-red-400" dot="bg-red-500" />
                    )}
                    {/* Overall progress */}
                    {stats.total > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <div className="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${Math.round((stats.completed / stats.total) * 100)}%` }}
                                />
                            </div>
                            <span className="text-xs text-theme-muted tabular-nums">
                                {Math.round((stats.completed / stats.total) * 100)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── TOOLBAR ── */}
            <div className="px-6 py-2.5 border-b border-theme-primary/40 flex items-center gap-2 flex-wrap shrink-0 surface-tertiary">
                {/* Quick filters */}
                <div className="flex items-center gap-1">
                    {([
                        ['all', 'Todas'],
                        ['mine', 'Mis tareas'],
                        ['unassigned', 'Sin asignar'],
                        ['overdue', 'Vencidas'],
                    ] as [QuickFilter, string][]).map(([q, label]) => (
                        <button
                            key={q}
                            onClick={() => setQuickFilter(q)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${quickFilter === q ? 'bg-olive-600 text-white' : 'text-theme-muted hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-theme-primary'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-theme-primary/30 mx-1" />

                {/* Search */}
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar…"
                        className="w-full pl-8 pr-7 py-1.5 text-xs surface-secondary border border-theme-primary rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-olive-400 transition-colors"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-xs surface-secondary border border-theme-primary rounded-xl px-2.5 py-1.5 text-theme-primary focus:outline-none focus:border-olive-400 cursor-pointer"
                >
                    <option value="">Estado</option>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>

                {/* Priority filter */}
                <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="text-xs surface-secondary border border-theme-primary rounded-xl px-2.5 py-1.5 text-theme-primary focus:outline-none focus:border-olive-400 cursor-pointer"
                >
                    <option value="">Prioridad</option>
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>

                {/* Clear filters */}
                {hasFilters && (
                    <button
                        onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setQuickFilter('all'); }}
                        className="flex items-center gap-1 text-xs text-theme-muted hover:text-red-500 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Limpiar
                    </button>
                )}

                {/* Collapse/Expand all (table only) */}
                {viewMode === 'table' && allGroups.length > 1 && (
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={collapseAll}
                            title="Colapsar todo"
                            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted transition-colors"
                        >
                            <ChevronsDownUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={expandAll}
                            title="Expandir todo"
                            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted transition-colors"
                        >
                            <ChevronsUpDown className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

                {/* TABLE VIEW */}
                {viewMode === 'table' && (
                    <div>
                        {filteredGroups.length === 0 ? (
                            <EmptyState search={search} hasFilters={hasFilters} />
                        ) : (
                            filteredGroups.map((group, i) => (
                                <BoardGroup
                                    key={group.id}
                                    group={group}
                                    colorIndex={allGroups.findIndex(g => g.id === group.id)}
                                    users={users}
                                    search={search}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    onAdd={handleAdd}
                                    onOpen={t => setSelectedTask(t)}
                                    isCollapsed={collapsedGroups.has(group.id)}
                                    onToggleCollapse={() => toggleCollapse(group.id)}
                                    updatingTasks={updatingTasks}
                                    sortField={sortField}
                                    sortDir={sortDir}
                                    onSort={handleSort}
                                />
                            ))
                        )}
                        {/* Global quick-add */}
                        <button
                            onClick={() => handleAdd('Nueva tarea', filterProjectId)}
                            className="mt-2 w-full flex items-center gap-2 text-sm text-theme-muted hover:text-olive-600 dark:hover:text-olive-400 transition-colors px-4 py-2.5 rounded-xl border border-dashed border-theme-primary/40 hover:border-olive-400 hover:bg-olive-50/30 dark:hover:bg-olive-900/10"
                        >
                            <Plus className="w-4 h-4" />
                            {filterProjectId ? 'Nueva tarea rápida en este proyecto' : 'Nueva tarea rápida (sin proyecto)'}
                        </button>
                    </div>
                )}

                {/* KANBAN VIEW */}
                {viewMode === 'kanban' && (
                    <div
                        className="flex gap-4 pb-4 overflow-x-auto min-h-[calc(100%-2rem)]"
                        onDragEnd={handleDragEnd}
                    >
                        {kanbanCols.map(col => (
                            <KanbanColumn
                                key={col.value}
                                status={col}
                                tasks={col.tasks}
                                onOpen={t => setSelectedTask(t)}
                                draggingId={draggingId}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDrop={handleDrop}
                                onAdd={handleAdd}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── TASK DETAIL MODAL ── */}
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    isOpen
                    onClose={() => setSelectedTask(null)}
                    onUpdate={async () => {
                        await loadData(true);
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════ */
function EmptyState({ search, hasFilters }: { search: string; hasFilters: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-olive-100 dark:bg-olive-900/30 rounded-full flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-olive-500" />
            </div>
            <p className="text-base font-bold text-theme-primary mb-1">
                {hasFilters ? 'Sin resultados' : 'Sin tareas'}
            </p>
            <p className="text-sm text-theme-muted max-w-xs">
                {search
                    ? `No hay tareas que coincidan con "${search}"`
                    : hasFilters
                        ? 'Prueba a cambiar o limpiar los filtros activos'
                        : 'Agrega tu primera tarea usando el botón "+ Agregar tarea" dentro de un grupo o la barra de abajo.'}
            </p>
        </div>
    );
}
