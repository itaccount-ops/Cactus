'use client';

import {
    useState, useEffect, useMemo, useRef, useCallback, Fragment,
} from 'react';
import { createPortal } from 'react-dom';
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
    getMyWorkBoard,
    updateGroupColumns,
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

const DEFAULT_COLUMNS: BoardColumn[] = [
    { id: 'status', title: 'Estado', type: 'STATUS', width: 150, order: 0 },
    { id: 'person', title: 'Persona', type: 'PERSON', width: 150, order: 1 },
    { id: 'date', title: 'Fecha', type: 'DATE', width: 150, order: 2 },
    { id: 'text', title: 'Texto', type: 'TEXT', width: 250, order: 3 },
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
            className="px-3 py-2 text-xs text-theme-secondary truncate cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors border-r border-theme-primary/10 last:border-r-0 flex items-center justify-center h-10"
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

// 4. PERSON/AVATAR CELL — uses portal so dropdown floats above all stacking contexts
function PersonCell({ value, onUpdate, users, width }: { value?: any, onUpdate: (v: any) => void, users: any[], width: number }) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);
    const selectedUsers = selectedIds.map((id: string) => users.find(u => u.id === id)).filter(Boolean);
    const [search, setSearch] = useState('');
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const filtered = users.filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase()));

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (triggerRef.current?.contains(e.target as Node)) return;
            if (dropdownRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Calculate position when opening
    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 4,
                left: rect.left + rect.width / 2 - 100, // center the 200px dropdown
            });
        }
    }, [open]);

    return (
        <div
            className="relative border-r border-theme-primary/10 last:border-r-0 h-10 flex items-center justify-center cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors px-1"
            style={{ width }}
            ref={triggerRef}
            onClick={e => { e.stopPropagation(); setOpen(!open); }}
        >
            {selectedUsers.length > 0 ? (
                <div className="flex -space-x-2 overflow-hidden">
                    {selectedUsers.slice(0, 2).map((user: any, i: number) => (
                        user.image ? (
                            <img key={user.id} src={user.image} alt={user.name} className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-neutral-900" style={{ zIndex: 10 - i }} title={user.name} />
                        ) : (
                            <div key={user.id} className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-[10px] border-2 border-white dark:border-neutral-900" style={{ zIndex: 10 - i }} title={user.name}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )
                    ))}
                    {selectedUsers.length > 2 && (
                        <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[9px] font-bold text-theme-secondary border-2 border-white dark:border-neutral-900 z-0">
                            +{selectedUsers.length - 2}
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-6 h-6 rounded-full border border-dashed border-theme-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-theme-muted" />
                </div>
            )}

            {/* Portal dropdown — renders at document.body level so nothing clips it */}
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[9999] bg-white dark:bg-neutral-900 border border-theme-primary rounded-xl shadow-2xl py-1.5 min-w-[220px]"
                    style={{ top: pos.top, left: pos.left }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="px-2 pb-1.5">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar persona..."
                            onClick={e => e.stopPropagation()}
                            className="w-full text-xs px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-olive-400"
                            autoFocus
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
                        {filtered.map((u: any) => {
                            const isSelected = selectedIds.includes(u.id);
                            return (
                                <button
                                    key={u.id}
                                    onClick={e => {
                                        e.stopPropagation();
                                        const newIds = isSelected ? selectedIds.filter((id: string) => id !== u.id) : [...selectedIds, u.id];
                                        onUpdate(newIds.length > 0 ? newIds : null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    {u.image
                                        ? <img src={u.image} alt={u.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                        : <div className="w-5 h-5 rounded-full bg-olive-100 dark:bg-olive-900/50 flex items-center justify-center font-bold text-olive-700 dark:text-olive-300 text-[9px] shrink-0">{u.name?.[0]?.toUpperCase()}</div>
                                    }
                                    <span className={`flex-1 text-left truncate ${isSelected ? 'font-bold text-theme-primary' : 'text-theme-secondary'}`}>{u.name}</span>
                                    {isSelected && <Check className="w-3 h-3 text-olive-600 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// 5. DATE CELL
function DateCell({ value, onUpdate, width }: { value?: string, onUpdate: (v: string | null) => void, width: number }) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            try {
                // @ts-ignore
                inputRef.current?.showPicker();
            } catch (e) {
                // Ignore if browser doesn't support showPicker on date inputs
            }
        }
    }, [editing]);

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
    draggingRowId, onDragStart, onDragEnd, onDropRow,
    isSelected, onToggleSelect
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
    isSelected?: boolean;
    onToggleSelect?: () => void;
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

                {/* Fixed Name Column — checkbox + name, Monday style */}
                <div className="w-[350px] shrink-0 flex items-center border-r border-theme-primary/10 h-10 relative sticky left-0 bg-white dark:bg-neutral-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-neutral-50 dark:group-hover:bg-neutral-900/40 transition-colors">
                    {/* Checkbox flush left */}
                    <div className="w-10 shrink-0 flex items-center justify-center" onClick={e => { e.stopPropagation(); onToggleSelect?.(); }}>
                        <div className={`w-4 h-4 rounded border cursor-pointer transition-colors flex items-center justify-center ${isSelected ? 'bg-olive-600 border-olive-600' : 'border-theme-primary/30 hover:border-olive-500'
                            }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                    </div>
                    <div className="absolute left-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-0.5 text-theme-muted hover:text-theme-primary cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {!isSubitem && (
                        <button
                            onClick={() => setSubItemsOpen(!subItemsOpen)}
                            className={`mr-1 p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors ${item.subitems?.length ? 'text-theme-primary' : 'text-theme-muted opacity-0 group-hover:opacity-100'}`}
                        >
                            {subItemsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {isSubitem && (
                        <CornerDownRight className="w-3.5 h-3.5 text-theme-muted mr-2 ml-2 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0 flex items-center pr-2">

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
                        className="ml-1 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-theme-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!isSubitem && onCreateSubitem && (
                        <button
                            onClick={e => { e.stopPropagation(); onCreateSubitem(item.id, 'Nuevo subelemento'); setSubItemsOpen(true); }}
                            className="ml-0.5 p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted hover:text-theme-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0"
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

function GroupColorPicker({ color, onUpdate, canEdit }: { color: string, onUpdate: (c: string) => void, canEdit: boolean }) {
    const { open, setOpen, ref } = useDropdown();

    if (!canEdit) {
        return <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />;
    }

    return (
        <div className="relative shrink-0 flex items-center" ref={ref}>
            <button onClick={() => setOpen(!open)} className="w-5 h-5 flex items-center justify-center rounded-sm hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors" title="Cambiar color">
                <div className="w-3 h-3 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-transform hover:scale-110" style={{ backgroundColor: color }} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-theme-primary shadow-xl rounded-lg p-3 z-[150] grid grid-cols-4 gap-2.5"
                    >
                        {GROUP_COLORS.map(c => (
                            <button key={c} onClick={() => { onUpdate(c); setOpen(false); }} className="w-6 h-6 rounded-full border border-theme-primary/20 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ColumnAdder({ onAdd }: { onAdd: (type: ColumnType, title: string) => void }) {
    const { open, setOpen, ref } = useDropdown();
    const [search, setSearch] = useState('');

    const COLUMN_TYPES: { type: ColumnType, title: string, icon: string, color: string }[] = [
        { type: 'STATUS', title: 'Estado', icon: '▣', color: '#22c55e' },
        { type: 'TEXT', title: 'Texto', icon: 'T', color: '#f97316' },
        { type: 'PERSON', title: 'Personas', icon: '☺', color: '#3b82f6' },
        { type: 'DATE', title: 'Fecha', icon: '▨', color: '#16a34a' },
        { type: 'CODE', title: 'Código', icon: '#', color: '#8b5cf6' },
    ];

    const filtered = COLUMN_TYPES.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative shrink-0" ref={ref}>
            <button onClick={() => setOpen(!open)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-theme-muted hover:text-theme-primary transition-colors" title="Añadir columna">
                <Plus className="w-4 h-4" />
            </button>
            {open && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        // Calculate position based on the trigger ref
                        style={{
                            position: 'absolute',
                            top: ref.current ? ref.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
                            right: ref.current ? window.innerWidth - ref.current.getBoundingClientRect().right : 0,
                        }}
                        className="w-[280px] bg-white dark:bg-neutral-900 border border-theme-primary shadow-2xl rounded-xl p-3 z-[200]"
                    >
                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Busca o describe tu columna"
                                onClick={e => e.stopPropagation()}
                                className="w-full pl-8 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-theme-primary/30 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-olive-400"
                                autoFocus
                            />
                        </div>
                        {/* Esenciales section */}
                        <div className="text-[10px] font-bold text-theme-muted uppercase tracking-wider mb-2">Esenciales</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {filtered.map(col => (
                                <button
                                    key={col.type}
                                    onClick={() => { onAdd(col.type, col.title); setOpen(false); setSearch(''); }}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                                >
                                    <span className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: col.color }}>
                                        {col.icon}
                                    </span>
                                    <span className="text-xs font-medium text-theme-primary">{col.title}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

export default function MondayBoard({ filterProjectId = null }: { filterProjectId?: string | null }) {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role as string;
    const canEditStructure = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(role);

    const toast = useToast();

    const [board, setBoard] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [draggingColInfo, setDraggingColInfo] = useState<{ id: string, groupId: string } | null>(null);
    const [draggingRowInfo, setDraggingRowInfo] = useState<{ id: string, groupId: string } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const loadData = useCallback(async (silent = false) => {
        try {
            const isMyWork = filterProjectId === 'my-work';
            const res = isMyWork ? await getMyWorkBoard() : await getOrCreateBoard(filterProjectId);

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

    const handleDeleteGroup = async (groupId: string) => {
        if (!board) return;
        let newBoard = JSON.parse(JSON.stringify(board));
        newBoard.groups = newBoard.groups.filter((g: any) => g.id !== groupId);
        setBoard(newBoard);

        const res = await deleteGroup(groupId);
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true);
        }
    };

    const handleUpdateGroupName = async (groupId: string, newName: string) => {
        if (!newName.trim()) return;

        let newBoard = JSON.parse(JSON.stringify(board));
        const group = newBoard.groups.find((g: any) => g.id === groupId);
        if (group) group.name = newName.trim();
        setBoard(newBoard);

        const res = await updateGroup(groupId, { name: newName.trim() });
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true);
        }
    };

    const handleUpdateGroupColor = async (groupId: string, newColor: string) => {
        let newBoard = JSON.parse(JSON.stringify(board));
        const group = newBoard.groups.find((g: any) => g.id === groupId);
        if (group && group.color !== newColor) {
            group.color = newColor;
            setBoard(newBoard);
            const res = await updateGroup(groupId, { color: newColor });
            if (res.error) {
                toast.error('Error', res.error);
                loadData(true);
            }
        }
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
        const action = isSub ? deleteSubitem : deleteItem;
        const res = await action(id);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleCreateSubitem = async (itemId: string, name: string) => {
        const res = await createSubitem(itemId, name);
        if (res.error) toast.error('Error', res.error);
        else loadData(true);
    };

    const handleReorderColumns = async (draggedColId: string, targetColId: string, groupId: string) => {
        if (!board || draggedColId === targetColId) return;

        let newBoard = JSON.parse(JSON.stringify(board));
        const groupIndex = newBoard.groups.findIndex((g: any) => g.id === groupId);
        if (groupIndex === -1) return;
        const group = newBoard.groups[groupIndex];

        const cols = [...(group.columns as BoardColumn[])];
        const dragIdx = cols.findIndex(c => c.id === draggedColId);
        const targetIdx = cols.findIndex(c => c.id === targetColId);

        if (dragIdx === -1 || targetIdx === -1) return;

        const [draggedItem] = cols.splice(dragIdx, 1);
        cols.splice(targetIdx, 0, draggedItem);

        // Update order property
        const reordered = cols.map((c, i) => ({ ...c, order: i }));
        group.columns = reordered;

        // Optimistic
        setBoard(newBoard);

        const res = await updateGroupColumns(groupId, reordered);
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true); // Rollback
        }
    };

    const handleAddColumn = async (type: ColumnType, title: string, groupId: string) => {
        const newColId = `col_${Date.now()}`;

        let newBoard = JSON.parse(JSON.stringify(board));
        const groupIndex = newBoard.groups.findIndex((g: any) => g.id === groupId);
        if (groupIndex === -1) return;
        const group = newBoard.groups[groupIndex];

        const cols = [...(group.columns || [])];
        const newCol: BoardColumn = {
            id: newColId,
            title,
            type,
            width: type === 'TEXT' ? 150 : 120,
            order: cols.length
        };
        const reordered = [...cols, newCol];
        group.columns = reordered;

        setBoard(newBoard);

        const res = await updateGroupColumns(groupId, reordered);
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true);
        }
    };

    const handleDeleteColumn = async (colId: string, groupId: string) => {
        if (!board) return;
        let newBoard = JSON.parse(JSON.stringify(board));
        const groupIndex = newBoard.groups.findIndex((g: any) => g.id === groupId);
        if (groupIndex === -1) return;
        const group = newBoard.groups[groupIndex];
        const cols = (group.columns as BoardColumn[]).filter(c => c.id !== colId);
        group.columns = cols;
        setBoard(newBoard);

        const res = await updateGroupColumns(groupId, cols);
        if (res.error) {
            toast.error('Error', res.error);
            loadData(true);
        }
    };

    const toggleSelectItem = (itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const toggleSelectGroup = (group: any) => {
        const itemIds = group.items.map((i: any) => i.id);
        const allSelected = itemIds.length > 0 && itemIds.every((id: string) => selectedItems.has(id));
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (allSelected) {
                itemIds.forEach((id: string) => next.delete(id));
            } else {
                itemIds.forEach((id: string) => next.add(id));
            }
            return next;
        });
    };

    const toggleGroupCollapse = (groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
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

    const isMyWork = board.isMyWork;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-neutral-950">
            {/* Header — Scrollable, not sticky */}
            <div className="px-6 pt-5 pb-3 border-b border-theme-primary shrink-0 bg-white dark:bg-neutral-950">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-theme-primary flex items-center gap-2">
                            <Layers className="w-5 h-5 text-olive-600 shrink-0" />
                            {board.project?.name || board.name}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-5 relative">
                <div className="inline-flex flex-col min-w-max pb-32">

                    {/* Groups */}
                    {board.groups.map((group: any) => {
                        const columns = (group.columns && Array.isArray(group.columns) && group.columns.length > 0)
                            ? (group.columns as BoardColumn[])
                            : DEFAULT_COLUMNS;

                        const isCollapsed = collapsedGroups.has(group.id);

                        return (
                            <div key={group.id} className="mb-8 relative transition-all duration-300">
                                <div className="flex items-center gap-2 mb-2 py-1 font-sans sticky left-0 z-30">
                                    <button
                                        className="p-0.5 rounded-sm hover:bg-neutral-200 dark:hover:bg-neutral-800 text-theme-muted transition-colors shrink-0"
                                        onClick={() => toggleGroupCollapse(group.id)}
                                        title={isCollapsed ? "Expandir grupo" : "Colapsar grupo"}
                                    >
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} style={{ color: group.color }} />
                                    </button>
                                    <GroupColorPicker color={group.color} canEdit={canEditStructure} onUpdate={(c) => handleUpdateGroupColor(group.id, c)} />
                                    {canEditStructure ? (
                                        <input
                                            type="text"
                                            defaultValue={group.name}
                                            onBlur={(e) => handleUpdateGroupName(group.id, e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            }}
                                            className="font-bold text-lg bg-transparent border-none outline-none focus:ring-1 focus:ring-olive-400 rounded transition-all max-w-[300px]"
                                            style={{ color: group.color }}
                                        />
                                    ) : (
                                        <h2 className="font-bold text-lg truncate max-w-[300px]" style={{ color: group.color }}>{group.name}</h2>
                                    )}
                                    <span className="text-xs text-theme-muted bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{group.items.length}</span>
                                    {/* Delete group button */}
                                    {canEditStructure && board.groups.length > 1 && (
                                        <button
                                            onClick={() => { if (confirm('¿Eliminar este grupo y todos sus elementos?')) handleDeleteGroup(group.id); }}
                                            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-theme-muted hover:text-red-500 transition-colors opacity-0 hover:opacity-100"
                                            title="Eliminar grupo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border border-theme-primary/20 rounded-md shadow-sm overflow-visible min-h-[50px] pb-2 origin-top"
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
                                        {/* Header Row for Group — NOT sticky, scrolls with content */}
                                        <div className="flex items-center bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm shadow-sm py-2 border-b border-theme-primary/20 w-fit min-w-full">
                                            <div className="w-[350px] shrink-0 pl-2 pr-3 font-semibold text-xs text-theme-secondary uppercase tracking-wider sticky left-0 z-20 bg-white dark:bg-neutral-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] flex items-center gap-2">
                                                {/* Group-level checkbox */}
                                                <div
                                                    className="w-10 shrink-0 flex items-center justify-center cursor-pointer"
                                                    onClick={() => toggleSelectGroup(group)}
                                                >
                                                    {(() => {
                                                        const itemIds = group.items.map((i: any) => i.id);
                                                        const allSelected = itemIds.length > 0 && itemIds.every((id: string) => selectedItems.has(id));
                                                        return (
                                                            <div className={`w-4 h-4 rounded border cursor-pointer transition-colors flex items-center justify-center ${allSelected ? 'bg-olive-600 border-olive-600' : 'border-theme-primary/30 hover:border-olive-500'
                                                                }`}>
                                                                {allSelected && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                Nombre
                                            </div>
                                            {columns.map((col: BoardColumn) => (
                                                <div
                                                    key={col.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        setDraggingColInfo({ id: col.id, groupId: group.id });
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragEnd={() => setDraggingColInfo(null)}
                                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (draggingColInfo && draggingColInfo.groupId === group.id) {
                                                            handleReorderColumns(draggingColInfo.id, col.id, group.id);
                                                        }
                                                    }}
                                                    className={`group/col font-semibold text-xs text-theme-secondary uppercase tracking-wider border-l border-theme-primary/10 px-3 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative ${draggingColInfo?.id === col.id ? 'opacity-50' : ''}`}
                                                    style={{ width: col.width || 150 }}
                                                >
                                                    {col.title}
                                                    {/* Delete column button on hover */}
                                                    {canEditStructure && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteColumn(col.id, group.id); }}
                                                            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-red-600 z-30"
                                                            title={`Eliminar ${col.title}`}
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {canEditStructure && (
                                                <div className="flex items-center pl-2">
                                                    <ColumnAdder onAdd={(type, title) => handleAddColumn(type, title, group.id)} />
                                                </div>
                                            )}
                                        </div>

                                        {group.items.length === 0 ? (
                                            <div className="p-4 text-sm text-theme-muted text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/40 sticky left-0" onClick={() => handleAddItem(group.id)}>
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
                                                    isSelected={selectedItems.has(item.id)}
                                                    onToggleSelect={() => toggleSelectItem(item.id)}
                                                />
                                            ))
                                        )}
                                        {!isMyWork && group.items.length > 0 && (
                                            <div className="flex items-center h-9 border-t border-theme-primary/20 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 cursor-text group/add w-fit min-w-full" onClick={() => handleAddItem(group.id)}>
                                                <div className="w-[350px] shrink-0 border-r border-theme-primary/10 h-full flex items-center px-4 text-xs text-theme-muted transition-colors group-hover/add:text-theme-primary sticky left-0 bg-white dark:bg-neutral-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    + Añadir elemento
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}

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

