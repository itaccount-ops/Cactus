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
    GripVertical, CornerDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    getOrCreateBoard,
    updateBoardColumns,
    createGroup,
    updateGroup,
    deleteGroup,
    createItem,
    updateItemName,
    updateItemValue,
    deleteItem,
    createSubitem,
    updateSubitemName,
    updateSubitemValue,
    deleteSubitem,
    reorderItem,
    BoardColumn,
    ColumnType
} from '@/app/(protected)/tablero/board-actions';
import { useRealtimePolling } from '@/hooks/useRealtimePolling';
import { useToast } from '@/components/ui/Toast';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & CONFIG
═══════════════════════════════════════════════════════════════ */

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendiente', bg: 'bg-neutral-400', text: 'text-white' },
    { value: 'IN_PROGRESS', label: 'En curso', bg: 'bg-blue-500', text: 'text-white' },
    { value: 'COMPLETED', label: 'Completado', bg: 'bg-green-500', text: 'text-white' },
    { value: 'CANCELLED', label: 'Cancelado', bg: 'bg-red-500', text: 'text-white' },
];

function getStatusCfg(v?: string) {
    if (!v) return { value: '', label: '', bg: 'bg-neutral-200 dark:bg-neutral-700', text: 'text-transparent' };
    return STATUS_OPTIONS.find(s => s.value === v) ?? STATUS_OPTIONS[0];
}

const GROUP_COLORS = [
    '#6366f1', '#8b5cf6', '#f59e0b', '#10b981',
    '#3b82f6', '#ec4899', '#f97316', '#14b8a6',
    '#ef4444', '#84cc16', '#a78bfa', '#fb923c',
];

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

/* ═══════════════════════════════════════════════════════════════
   DYNAMIC CELLS
═══════════════════════════════════════════════════════════════ */

// 1. TEXT CELL
function TextCell({ value, onUpdate, width }: { value?: string, onUpdate: (v: string) => void, width: number }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setDraft(value || ''); }, [value]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    if (editing) {
        return (
            <div className="px-2" style={{ width }}>
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => { onUpdate(draft); setEditing(false); }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { onUpdate(draft); setEditing(false); }
                        if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
                    }}
                    className="w-full text-xs surface-secondary border border-olive-400 rounded px-1.5 py-0.5 focus:outline-none"
                    onClick={e => e.stopPropagation()}
                />
            </div>
        );
    }
    return (
        <div
            className="px-3 py-2 text-xs text-theme-secondary truncate cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors border-r border-theme-primary/10 last:border-r-0 flex items-center h-10"
            style={{ width }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
            {value || <span className="opacity-0 group-hover:opacity-30 transition-opacity whitespace-pre">Escribir text...</span>}
        </div>
    );
}

// 2. CODE CELL (Same as Text for now, maybe badge styling later)
function CodeCell({ value, onUpdate, width }: { value?: string, onUpdate: (v: string) => void, width: number }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setDraft(value || ''); }, [value]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    if (editing) {
        return (
            <div className="px-2" style={{ width }}>
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => { onUpdate(draft); setEditing(false); }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { onUpdate(draft); setEditing(false); }
                        if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
                    }}
                    className="w-full text-xs font-mono surface-secondary border border-olive-400 rounded px-1.5 py-0.5 focus:outline-none uppercase"
                    onClick={e => e.stopPropagation()}
                />
            </div>
        );
    }
    return (
        <div
            className="px-3 py-2 text-xs truncate cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors border-r border-theme-primary/10 last:border-r-0 flex items-center justify-center h-10"
            style={{ width }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
            {value ? (
                <span className="bg-neutral-100 dark:bg-neutral-800 text-theme-primary px-2 py-0.5 rounded-sm font-mono tracking-wider">{value}</span>
            ) : <span className="opacity-0 group-hover:opacity-30 transition-opacity">---</span>}
        </div>
    );
}

// 3. STATUS CELL (Solid color blocks mimicking Monday)
function StatusCell({ value, onUpdate, width }: { value?: string, onUpdate: (v: string) => void, width: number }) {
    const { open, setOpen, ref } = useDropdown();
    const cfg = getStatusCfg(value);

    return (
        <div className="relative border-r border-theme-primary/10 last:border-r-0 h-10 flex items-center justify-center cursor-pointer p-0.5" style={{ width }} ref={ref} onClick={e => { e.stopPropagation(); setOpen(!open); }}>
            {/* The Solid Block */}
            <div className={`w-full h-full flex items-center justify-center transition-all ${cfg.bg} ${cfg.text} hover:opacity-90 ${!value ? 'group-hover:bg-neutral-300 dark:group-hover:bg-neutral-600' : ''}`}>
                <span className="text-[11px] font-medium tracking-wide">{cfg.label}</span>
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-[100] top-full mt-1 w-full left-0 bg-white dark:bg-neutral-900 border border-theme-primary rounded-lg shadow-xl p-1.5 flex flex-col gap-1"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={e => {
                                    e.stopPropagation();
                                    onUpdate(opt.value);
                                    setOpen(false);
                                }}
                                className={`w-full h-8 flex items-center justify-center text-[11px] font-medium text-white transition-opacity hover:opacity-85 ${opt.bg}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// 4. PERSON/AVATAR CELL
function PersonCell({ value, onUpdate, users, width }: { value?: string, onUpdate: (v: string | null) => void, users: any[], width: number }) {
    const { open, setOpen, ref } = useDropdown();
    const user = users.find(u => u.id === value);
    const [search, setSearch] = useState('');

    const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative border-r border-theme-primary/10 last:border-r-0 h-10 flex items-center justify-center cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors" style={{ width }} ref={ref} onClick={e => { e.stopPropagation(); setOpen(!open); }}>
            {user ? (
                user.image ? (
                    <img src={user.image} alt={user.name} className="w-6 h-6 rounded-full object-cover" title={user.name} />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-[10px]" title={user.name}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )
            ) : (
                <div className="w-6 h-6 rounded-full border border-dashed border-theme-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-theme-muted" />
                </div>
            )}

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute z-[100] top-full mt-1.5 left-1/2 -translate-x-1/2 surface-secondary border border-theme-primary rounded-xl shadow-xl py-1.5 min-w-[200px]"
                    >
                        <div className="px-2 pb-1.5">
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar persona..."
                                onClick={e => e.stopPropagation()}
                                className="w-full text-xs px-2 py-1 surface-secondary border border-theme-primary rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-olive-400"
                            />
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onUpdate(null); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-theme-muted"
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center">
                                <Minus className="w-2.5 h-2.5" />
                            </div>
                            Sin asignar
                        </button>
                        <div className="max-h-44 overflow-y-auto">
                            {filtered.map(u => (
                                <button
                                    key={u.id}
                                    onClick={e => { e.stopPropagation(); onUpdate(u.id); setOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    {u.image
                                        ? <img src={u.image} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                        : <div className="w-5 h-5 rounded-full bg-olive-100 dark:bg-olive-900/50 flex items-center justify-center font-bold text-olive-700 dark:text-olive-300 text-[9px] shrink-0">{u.name?.[0]?.toUpperCase()}</div>
                                    }
                                    <span className={`flex-1 text-left truncate ${value === u.id ? 'font-bold text-theme-primary' : 'text-theme-secondary'}`}>{u.name}</span>
                                    {value === u.id && <Check className="w-3 h-3 text-olive-600 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// 5. DATE CELL
function DateCell({ value, onUpdate, width }: { value?: string, onUpdate: (v: string | null) => void, width: number }) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    if (editing) {
        return (
            <div className="px-2" style={{ width }}>
                <input
                    ref={inputRef}
                    type="date"
                    defaultValue={value || ''}
                    className="w-full text-xs surface-secondary border border-olive-400 rounded px-1.5 py-0.5 focus:outline-none text-theme-primary"
                    onBlur={e => { onUpdate(e.target.value || null); setEditing(false); }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditing(false);
                    }}
                    onClick={e => e.stopPropagation()}
                />
            </div>
        );
    }
    return (
        <div
            className="px-3 py-2 text-xs truncate cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors border-r border-theme-primary/10 last:border-r-0 flex items-center justify-center h-10"
            style={{ width }}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
            {value ? (
                <span className="text-theme-primary font-medium">{format(new Date(value), 'd MMM', { locale: es })}</span>
            ) : <span className="opacity-0 group-hover:opacity-30 transition-opacity">---</span>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   DYNAMIC ROW COMPONENT
═══════════════════════════════════════════════════════════════ */

function DynamicCell({
    col, value, itemId, isSubitem, users, onUpdate
}: {
    col: BoardColumn, value: any, itemId: string, isSubitem: boolean, users: any[],
    onUpdate: (id: string, colId: string, val: any, isSub: boolean) => void
}) {
    const handleUpd = (val: any) => onUpdate(itemId, col.id, val, isSubitem);

    switch (col.type) {
        case 'TEXT': return <TextCell value={value} onUpdate={handleUpd} width={col.width || 150} />;
        case 'CODE': return <CodeCell value={value} onUpdate={handleUpd} width={col.width || 120} />;
        case 'STATUS': return <StatusCell value={value} onUpdate={handleUpd} width={col.width || 150} />;
        case 'PERSON': return <PersonCell value={value} onUpdate={handleUpd} users={users} width={col.width || 100} />;
        case 'DATE': return <DateCell value={value} onUpdate={handleUpd} width={col.width || 120} />;
        default: return <div style={{ width: col.width || 100 }}></div>;
    }
}

function ItemRow({
    item, columns, users, onUpdateValue, onUpdateName, onDeleteItem, onCreateSubitem, isSubitem = false,
    draggingRowId, onDragStart, onDragEnd, onDropRow
}: {
    item: any;
    columns: BoardColumn[];
    users: any[];
    onUpdateValue: (id: string, colId: string, val: any, isSub: boolean) => void;
    onUpdateName: (id: string, name: string, isSub: boolean) => void;
    onDeleteItem: (id: string, isSub: boolean) => void;
    onCreateSubitem?: (itemId: string, name: string) => void;
    isSubitem?: boolean;
    draggingRowId?: string | null;
    onDragStart?: (id: string, groupId: string) => void;
    onDragEnd?: () => void;
    onDropRow?: (targetId: string, targetGroupId: string) => void;
}) {
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(item.name);
    const [subItemsOpen, setSubItemsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setNameDraft(item.name); }, [item.name]);
    useEffect(() => { if (editingName) inputRef.current?.focus(); }, [editingName]);

    const handleNameSave = () => {
        const t = nameDraft.trim();
        if (t && t !== item.name) {
            onUpdateName(item.id, t, isSubitem);
        } else {
            setNameDraft(item.name);
        }
        setEditingName(false);
    };

    return (
        <Fragment>
            <div
                className={`group flex items-center border-b border-theme-primary/20 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 relative ${isSubitem ? 'bg-neutral-50/50 dark:bg-neutral-900/20' : ''} ${draggingRowId === item.id ? 'opacity-50' : ''}`}
                draggable={!isSubitem && !!onDragStart}
                onDragStart={(e) => {
                    if (!isSubitem && onDragStart) {
                        e.dataTransfer.effectAllowed = 'move';
                        onDragStart(item.id, item.groupId);
                    }
                }}
                onDragEnd={() => !isSubitem && onDragEnd && onDragEnd()}
                onDragOver={(e) => {
                    if (!isSubitem && onDropRow) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }
                }}
                onDrop={(e) => {
                    if (!isSubitem && onDropRow) {
                        e.preventDefault();
                        e.stopPropagation();
                        onDropRow(item.id, item.groupId);
                    }
                }}
            >

                {/* Fixed Name Column */}
                <div className="flex-1 min-w-[300px] flex items-center border-r border-theme-primary/10 pl-6 pr-3 h-10 relative">
                    {/* Drag Handle & Row actions on hover */}
                    <div className="absolute left-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-0.5 text-theme-muted hover:text-theme-primary cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {!isSubitem && (
                        <button
                            onClick={() => setSubItemsOpen(!subItemsOpen)}
                            className={`mr-2 p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors ${item.subitems?.length ? 'text-theme-primary' : 'text-theme-muted opacity-0 group-hover:opacity-100'}`}
                        >
                            {subItemsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {isSubitem && (
                        <CornerDownRight className="w-3.5 h-3.5 text-theme-muted mr-3 ml-4 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        {/* Fake checkbox for looks */}
                        <div className="w-3.5 h-3.5 rounded border border-theme-primary/30 shrink-0" />

                        {editingName ? (
                            <input
                                ref={inputRef}
                                value={nameDraft}
                                onChange={e => setNameDraft(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleNameSave();
                                    if (e.key === 'Escape') { setNameDraft(item.name); setEditingName(false); }
                                }}
                                className="w-full text-sm font-medium bg-transparent border-b border-olive-400 outline-none text-theme-primary py-0.5"
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <p
                                className="text-sm font-medium text-theme-primary truncate cursor-pointer hover:text-olive-700 dark:hover:text-olive-400 transition-colors"
                                onClick={e => { e.stopPropagation(); setEditingName(true); }}
                            >
                                {item.name}
                            </p>
                        )}
                    </div>

                    {/* Inline Delete Action */}
                    <button
                        onClick={e => { e.stopPropagation(); onDeleteItem(item.id, isSubitem); }}
                        className="ml-2 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-theme-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!isSubitem && onCreateSubitem && (
                        <button
                            onClick={e => { e.stopPropagation(); onCreateSubitem(item.id, 'Nuevo subelemento'); setSubItemsOpen(true); }}
                            className="ml-1 p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted hover:text-theme-primary transition-colors opacity-0 group-hover:opacity-100"
                            title="Añadir subelemento"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Dynamic Columns */}
                {columns.map(col => (
                    <DynamicCell
                        key={col.id}
                        col={col}
                        value={(item.values as Record<string, any>)?.[col.id]}
                        itemId={item.id}
                        isSubitem={isSubitem}
                        users={users}
                        onUpdate={onUpdateValue}
                    />
                ))}
            </div>

            {/* Subitems rendering */}
            {subItemsOpen && !isSubitem && item.subitems && (
                <div className="bg-neutral-50/30 dark:bg-neutral-900/10">
                    {item.subitems.map((sub: any) => (
                        <ItemRow
                            key={sub.id}
                            item={sub}
                            columns={columns}
                            users={users}
                            onUpdateValue={onUpdateValue}
                            onUpdateName={onUpdateName}
                            onDeleteItem={onDeleteItem}
                            isSubitem={true}
                        />
                    ))}
                    {/* Add Subitem Inline */}
                    <div className="flex flex-1 min-w-[300px] border-b border-theme-primary/20 h-9 relative items-center pl-16 opacity-50 hover:opacity-100 transition-opacity">
                        <CornerDownRight className="w-3.5 h-3.5 text-theme-muted mr-3 shrink-0" />
                        <button
                            className="text-xs text-theme-muted hover:text-theme-primary"
                            onClick={() => onCreateSubitem?.(item.id, 'Subelemento')}
                        >
                            + Añadir subelemento
                        </button>
                    </div>
                </div>
            )}
        </Fragment>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MONDAY BOARD EXPORT
═══════════════════════════════════════════════════════════════ */
export default function MondayBoard({ filterProjectId = null }: { filterProjectId?: string | null }) {
    const { data: session } = useSession();
    const toast = useToast();

    const [board, setBoard] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [draggingCol, setDraggingCol] = useState<string | null>(null);
    const [draggingRowInfo, setDraggingRowInfo] = useState<{ id: string, groupId: string } | null>(null);

    const loadData = useCallback(async (silent = false) => {
        try {
            const res = await getOrCreateBoard(filterProjectId);
            if (res.error) throw new Error(res.error);
            setBoard(res.board);
            setUsers(res.users ?? []);
        } catch (e: any) {
            if (!silent) toast.error('Error', e.message || 'No se pudo cargar el tablero');
        } finally {
            setLoading(false);
        }
    }, [filterProjectId]);

    useEffect(() => { loadData(); }, [loadData]);
    // useRealtimePolling({ onPoll: () => loadData(true), interval: 10000, enabled: true });

    /* ── Actions ── */
    const handleAddGroup = async () => {
        const res = await createGroup(board.id, 'Nuevo Grupo', GROUP_COLORS[board.groups.length % GROUP_COLORS.length]);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleAddItem = async (groupId: string) => {
        const res = await createItem(groupId, 'Nuevo elemento');
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleUpdateItemValue = async (id: string, colId: string, val: any, isSub: boolean) => {
        // Optimistic UI could go here
        const action = isSub ? updateSubitemValue : updateItemValue;
        const res = await action(id, colId, val);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleUpdateItemName = async (id: string, name: string, isSub: boolean) => {
        const action = isSub ? updateSubitemName : updateItemName;
        const res = await action(id, name);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleDeleteItem = async (id: string, isSub: boolean) => {
        const action = isSub ? deleteItem : deleteSubitem;
        const res = await action(id);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleCreateSubitem = async (itemId: string, name: string) => {
        const res = await createSubitem(itemId, name);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleReorderColumns = async (draggedColId: string, targetColId: string) => {
        if (!board || draggedColId === targetColId) return;

        const cols = [...(board.columns as BoardColumn[])];
        const dragIdx = cols.findIndex(c => c.id === draggedColId);
        const targetIdx = cols.findIndex(c => c.id === targetColId);

        if (dragIdx === -1 || targetIdx === -1) return;

        const [draggedItem] = cols.splice(dragIdx, 1);
        cols.splice(targetIdx, 0, draggedItem);

        // Update order property
        const reordered = cols.map((c, i) => ({ ...c, order: i }));

        // Optimistic
        setBoard({ ...board, columns: reordered });

        const res = await updateBoardColumns(board.id, reordered);
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true); // Rollback
        }
    };

    const handleReorderRow = async (targetId: string | null, targetGroupId: string) => {
        if (!board || !draggingRowInfo) return;
        const sourceId = draggingRowInfo.id;
        const sourceGroupId = draggingRowInfo.groupId;

        if (sourceId === targetId) return;

        let newBoard = JSON.parse(JSON.stringify(board)); // deep copy
        const srcGroup = newBoard.groups.find((g: any) => g.id === sourceGroupId);
        const tgtGroup = newBoard.groups.find((g: any) => g.id === targetGroupId);

        if (!srcGroup || !tgtGroup) return;

        const srcItemIdx = srcGroup.items.findIndex((i: any) => i.id === sourceId);
        const tgtItemIdx = targetId ? tgtGroup.items.findIndex((i: any) => i.id === targetId) : tgtGroup.items.length;

        if (srcItemIdx === -1) return;

        const [item] = srcGroup.items.splice(srcItemIdx, 1);
        item.groupId = targetGroupId;

        tgtGroup.items.splice(tgtItemIdx, 0, item);

        tgtGroup.items.forEach((it: any, idx: number) => it.order = idx);

        setBoard(newBoard);

        const res = await reorderItem(sourceId, targetGroupId, tgtItemIdx);
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true);
        }
    };


    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-olive-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!board) return null;

    const columns = board.columns as BoardColumn[];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-3 border-b border-theme-primary shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-theme-primary flex items-center gap-2">
                            <Layers className="w-5 h-5 text-olive-600 shrink-0" />
                            {board.name}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-5">
                <div className="inline-flex flex-col min-w-max pb-32">

                    {/* Header Row */}
                    <div className="flex items-center mb-1 sticky top-0 z-10 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm shadow-sm py-2 border-y border-theme-primary/20">
                        <div className="flex-1 min-w-[300px] pl-6 pr-3 font-semibold text-xs text-theme-secondary uppercase tracking-wider">
                            Elemento
                        </div>
                        {columns.map(col => (
                            <div
                                key={col.id}
                                draggable
                                onDragStart={(e) => {
                                    setDraggingCol(col.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => setDraggingCol(null)}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggingCol) handleReorderColumns(draggingCol, col.id);
                                }}
                                className={`font-semibold text-xs text-theme-secondary uppercase tracking-wider border-l border-theme-primary/10 px-3 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${draggingCol === col.id ? 'opacity-50' : ''}`}
                                style={{ width: col.width || 150 }}
                            >
                                {col.title}
                            </div>
                        ))}
                    </div>

                    {/* Groups */}
                    {board.groups.map((group: any) => (
                        <div key={group.id} className="mb-8">
                            <div className="flex items-center gap-2 mb-2 sticky top-10 z-10 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm py-1">
                                <ChevronDown className="w-4 h-4" style={{ color: group.color }} />
                                <h2 className="font-bold text-lg" style={{ color: group.color }}>{group.name}</h2>
                                <span className="text-xs text-theme-muted bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{group.items.length}</span>
                            </div>

                            <div
                                className="border border-theme-primary/20 rounded-md shadow-sm overflow-hidden min-h-[50px pb-2]"
                                style={{ borderLeft: `3px solid ${group.color}` }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggingRowInfo) handleReorderRow(null, group.id);
                                }}
                            >
                                {group.items.length === 0 ? (
                                    <div className="p-4 text-sm text-theme-muted text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/40" onClick={() => handleAddItem(group.id)}>
                                        + Añadir elemento
                                    </div>
                                ) : (
                                    group.items.map((item: any) => (
                                        <ItemRow
                                            key={item.id}
                                            item={item}
                                            columns={columns}
                                            users={users}
                                            onUpdateValue={handleUpdateItemValue}
                                            onUpdateName={handleUpdateItemName}
                                            onDeleteItem={handleDeleteItem}
                                            onCreateSubitem={handleCreateSubitem}
                                            draggingRowId={draggingRowInfo?.id}
                                            onDragStart={(id, groupId) => setDraggingRowInfo({ id, groupId })}
                                            onDragEnd={() => setDraggingRowInfo(null)}
                                            onDropRow={(targetId, targetGroupId) => handleReorderRow(targetId, targetGroupId)}
                                        />
                                    ))
                                )}
                                {group.items.length > 0 && (
                                    <div className="flex items-center h-9 border-t border-theme-primary/20 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 cursor-text group/add" onClick={() => handleAddItem(group.id)}>
                                        <div className="w-[300px] border-r border-theme-primary/10 h-full flex items-center px-4 text-xs text-theme-muted transition-colors group-hover/add:text-theme-primary">
                                            + Añadir elemento
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddGroup}
                        className="mt-4 px-4 py-2 text-sm border border-dashed border-theme-primary/40 text-theme-secondary rounded-lg hover:border-olive-400 hover:text-olive-500 transition-colors w-max"
                    >
                        + Nuevo Grupo
                    </button>

                </div>
            </div>
        </div>
    );
}

