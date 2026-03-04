'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, FileSpreadsheet, Check, ChevronDown,
    AlertTriangle, Loader2, ArrowRight, Table2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { importExcelToGroup } from '@/app/(protected)/tablero/board-actions';
import type { ColumnType } from '@/app/(protected)/tablero/board-actions';

const COLUMN_TYPES: { value: ColumnType; label: string; desc: string }[] = [
    { value: 'TEXT', label: 'Texto', desc: 'Texto libre' },
    { value: 'CODE', label: 'Código', desc: 'Código / TAG' },
    { value: 'STATUS', label: 'Estado', desc: 'Estado con colores' },
    { value: 'DATE', label: 'Fecha', desc: 'Fecha' },
    { value: 'PERSON', label: 'Persona', desc: 'Asignar usuario' },
];

const GROUP_COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

interface ExcelImportModalProps {
    boardId: string;
    onClose: () => void;
    onImported: () => void;
}

interface ColumnMapping {
    excelCol: string;
    selected: boolean;
    isNameColumn: boolean;
    boardColTitle: string;
    boardColType: ColumnType;
    sampleValues: string[];
}

export default function ExcelImportModal({ boardId, onClose, onImported }: ExcelImportModalProps) {
    const [step, setStep] = useState<'upload' | 'configure' | 'importing'>('upload');
    const [fileName, setFileName] = useState('');
    const [columns, setColumns] = useState<ColumnMapping[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [groupName, setGroupName] = useState('Importación Excel');
    const [groupColor, setGroupColor] = useState('#3b82f6');
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

                if (jsonData.length === 0) {
                    setError('El archivo Excel está vacío');
                    return;
                }

                // Extract column headers from first row keys
                const headers = Object.keys(jsonData[0]);
                const mappings: ColumnMapping[] = headers.map((h, i) => ({
                    excelCol: h,
                    selected: true,
                    isNameColumn: i === 0, // First col is name by default
                    boardColTitle: h.charAt(0).toUpperCase() + h.slice(1),
                    boardColType: guessColumnType(h, jsonData.slice(0, 5).map(r => r[h])),
                    sampleValues: jsonData.slice(0, 3).map(r => String(r[h] ?? '')),
                }));

                setColumns(mappings);
                setRows(jsonData);
                setFileName(file.name);
                setGroupName(sheetName || file.name.replace(/\.\w+$/, ''));
                setStep('configure');
            } catch (err) {
                console.error('Excel parse error:', err);
                setError('Error al leer el archivo. Asegúrate de que es un archivo Excel válido (.xlsx)');
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleImport = async () => {
        const nameCol = columns.find(c => c.isNameColumn);
        if (!nameCol) {
            setError('Selecciona una columna como "Nombre" del elemento');
            return;
        }

        const selectedCols = columns.filter(c => c.selected && !c.isNameColumn);
        if (selectedCols.length === 0) {
            setError('Selecciona al menos una columna además del nombre');
            return;
        }

        setImporting(true);
        setStep('importing');

        const mappings = selectedCols.map(c => ({
            excelCol: c.excelCol,
            boardColTitle: c.boardColTitle,
            boardColType: c.boardColType,
        }));

        // Serialize rows — convert Date objects to ISO strings (Server Actions only accept plain objects)
        const serializedRows = rows.map(row => {
            const plain: Record<string, any> = {};
            for (const [key, val] of Object.entries(row)) {
                plain[key] = val instanceof Date ? val.toISOString() : val;
            }
            return plain;
        });

        const result = await importExcelToGroup(
            boardId,
            groupName,
            groupColor,
            mappings,
            nameCol.excelCol,
            serializedRows
        );

        if (result.error) {
            setError(result.error);
            setImporting(false);
            setStep('configure');
        } else {
            onImported();
            onClose();
        }
    };

    const toggleColumn = (idx: number) => {
        setColumns(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
    };

    const setNameColumn = (idx: number) => {
        setColumns(prev => prev.map((c, i) => ({
            ...c,
            isNameColumn: i === idx,
            selected: i === idx ? true : c.selected,
        })));
    };

    const updateColType = (idx: number, type: ColumnType) => {
        setColumns(prev => prev.map((c, i) => i === idx ? { ...c, boardColType: type } : c));
    };

    const updateColTitle = (idx: number, title: string) => {
        setColumns(prev => prev.map((c, i) => i === idx ? { ...c, boardColTitle: title } : c));
    };

    const selectedCount = columns.filter(c => c.selected).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-theme-primary/20 overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-neutral-900 dark:to-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-theme-primary">Importar Excel</h2>
                            <p className="text-xs text-theme-muted">
                                {step === 'upload' ? 'Selecciona un archivo .xlsx' :
                                    step === 'configure' ? `${fileName} — ${rows.length} filas encontradas` :
                                        'Importando datos...'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-theme-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* STEP 1: Upload */}
                    {step === 'upload' && (
                        <div
                            className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer bg-blue-50/50 dark:bg-blue-900/10"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                                <Upload className="w-10 h-10 text-blue-500" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-theme-primary">Arrastra tu archivo Excel aquí</p>
                                <p className="text-sm text-theme-muted mt-1">o haz clic para seleccionar un archivo .xlsx</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />
                        </div>
                    )}

                    {/* STEP 2: Configure Columns */}
                    {step === 'configure' && (
                        <div className="space-y-6">
                            {/* Group Name & Color */}
                            <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-1.5 block">
                                        Nombre del nuevo grupo
                                    </label>
                                    <input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-theme-primary/30 bg-white dark:bg-neutral-800 text-theme-primary text-sm font-medium focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                                        placeholder="Nombre del grupo"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-1.5 block">Color</label>
                                    <div className="flex gap-1.5 p-1.5 rounded-xl border border-theme-primary/30 bg-white dark:bg-neutral-800">
                                        {GROUP_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setGroupColor(c)}
                                                className={`w-6 h-6 rounded-full transition-transform ${groupColor === c ? 'scale-125 ring-2 ring-offset-1 ring-blue-400' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Column Configuration */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-semibold text-theme-secondary uppercase tracking-wider">
                                        Columnas ({selectedCount} de {columns.length} seleccionadas)
                                    </label>
                                    <div className="flex items-center gap-2 text-xs text-theme-muted">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-green-500" />
                                            <span>= Columna Nombre</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {columns.map((col, idx) => (
                                        <div
                                            key={col.excelCol}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${col.isNameColumn
                                                ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10 dark:border-green-700'
                                                : col.selected
                                                    ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-900/10 dark:border-blue-800'
                                                    : 'border-neutral-200 dark:border-neutral-700 opacity-50'
                                                }`}
                                        >
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => !col.isNameColumn && toggleColumn(idx)}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${col.selected
                                                    ? col.isNameColumn
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'bg-blue-500 border-blue-500'
                                                    : 'border-neutral-300 dark:border-neutral-600'
                                                    }`}
                                            >
                                                {col.selected && <Check className="w-3 h-3 text-white" />}
                                            </button>

                                            {/* Column Name */}
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    value={col.boardColTitle}
                                                    onChange={(e) => updateColTitle(idx, e.target.value)}
                                                    className="text-sm font-semibold text-theme-primary bg-transparent border-none outline-none w-full"
                                                    disabled={!col.selected}
                                                />
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-theme-muted">Excel: "{col.excelCol}"</span>
                                                    <span className="text-[10px] text-theme-muted">·</span>
                                                    <span className="text-[10px] text-theme-muted truncate">
                                                        {col.sampleValues.filter(Boolean).slice(0, 2).join(', ')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Name Column Selector */}
                                            <button
                                                onClick={() => setNameColumn(idx)}
                                                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg shrink-0 transition-all ${col.isNameColumn
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-neutral-100 dark:bg-neutral-800 text-theme-muted hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600'
                                                    }`}
                                            >
                                                {col.isNameColumn ? '✓ Nombre' : 'Nombre'}
                                            </button>

                                            {/* Type Selector */}
                                            {col.selected && !col.isNameColumn && (
                                                <select
                                                    value={col.boardColType}
                                                    onChange={(e) => updateColType(idx, e.target.value as ColumnType)}
                                                    className="px-2 py-1.5 text-xs font-medium rounded-lg border border-theme-primary/30 bg-white dark:bg-neutral-800 text-theme-primary outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                                >
                                                    {COLUMN_TYPES.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <label className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                                    <Table2 className="w-3.5 h-3.5" />
                                    Vista previa ({Math.min(rows.length, 5)} de {rows.length} filas)
                                </label>
                                <div className="rounded-xl border border-theme-primary/20 overflow-hidden overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-neutral-100 dark:bg-neutral-800">
                                                {columns.filter(c => c.selected).map(c => (
                                                    <th key={c.excelCol} className={`px-3 py-2 text-left font-semibold text-theme-secondary whitespace-nowrap ${c.isNameColumn ? 'bg-green-100 dark:bg-green-900/30' : ''}`}>
                                                        {c.boardColTitle}
                                                        {c.isNameColumn && <span className="ml-1 text-green-600 text-[9px]">NOMBRE</span>}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="border-t border-theme-primary/10 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                                    {columns.filter(c => c.selected).map(c => (
                                                        <td key={c.excelCol} className={`px-3 py-1.5 text-theme-primary whitespace-nowrap ${c.isNameColumn ? 'font-medium' : ''}`}>
                                                            {formatPreviewValue(row[c.excelCol])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <p className="font-semibold text-theme-primary">Importando {rows.length} elementos...</p>
                            <p className="text-sm text-theme-muted">Esto puede tardar unos segundos</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'configure' && (
                    <div className="px-6 py-4 border-t border-theme-primary/20 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                        <button
                            onClick={() => { setStep('upload'); setColumns([]); setRows([]); setFileName(''); }}
                            className="px-4 py-2 text-sm font-medium text-theme-muted hover:text-theme-primary transition-colors"
                        >
                            ← Cambiar archivo
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-theme-muted hover:text-theme-primary transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || !columns.some(c => c.isNameColumn)}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Importar {rows.length} elementos
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

function guessColumnType(header: string, samples: any[]): ColumnType {
    const h = header.toLowerCase();

    // Check header name hints
    if (h.includes('fecha') || h.includes('date') || h.includes('dia') || h.includes('día')) return 'DATE';
    if (h.includes('estado') || h.includes('status')) return 'STATUS';
    if (h.includes('code') || h.includes('código') || h.includes('codigo') || h.includes('tag') || h.includes('ref')) return 'CODE';
    if (h.includes('owner') || h.includes('persona') || h.includes('asignado') || h.includes('responsable')) return 'PERSON';

    // Check sample values
    const validSamples = samples.filter(s => s !== '' && s !== null && s !== undefined);
    if (validSamples.length > 0) {
        const allDates = validSamples.every(s => {
            if (s instanceof Date) return true;
            const d = new Date(s);
            return !isNaN(d.getTime()) && String(s).match(/[\/-]/);
        });
        if (allDates) return 'DATE';
    }

    return 'TEXT';
}

function formatPreviewValue(val: any): string {
    if (val === null || val === undefined || val === '') return '—';
    if (val instanceof Date) return val.toLocaleDateString('es-ES');
    return String(val);
}
