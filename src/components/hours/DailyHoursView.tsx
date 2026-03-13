import { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    FileText,
    Send,
    Loader2,
    MoreVertical,
    Pencil,
    Trash2,
    X,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    List,
    Eye,
    Search,
    HardHat,
    Check
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
    getTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getActiveProjects,
    getHolidaysAndAbsences,
} from '@/app/(protected)/hours/actions';
import { getMiHoja } from '@/app/(protected)/control-horas/actions';
import {
    formatHoras,
    formatDiferencia,
    getColorDiasSinImputar,
    getColorDiferencia,
    ABSENCE_TYPE_LABELS,
    MESES,
    type ResumenMensual
} from '@/app/(protected)/control-horas/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
// import { toast } from 'sonner'; // Removed as package missing

interface Project {
    id: string;
    code: string;
    name: string;
}

interface TimeEntry {
    id: string;
    date: Date;
    hours: number;
    notes?: string | null;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string | null;
    approvedById?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    project: {
        id: string;
        code: string;
        name: string;
    };
    isExtraHours?: boolean | null;
    createdAt: Date;
}

interface DailyHoursViewProps {
    userId?: string;
    readOnly?: boolean;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatDateKeyUTC = (date: Date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export default function DailyHoursView({ userId, readOnly = false }: DailyHoursViewProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
    // Form state
    const [projectId, setProjectId] = useState('');
    const [formDate, setFormDate] = useState<string>(() => formatDateKey(new Date()));
    const [hours, setHours] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

    const [entryMode, setEntryMode] = useState<'total' | 'range'>('total');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isExtraHours, setIsExtraHours] = useState(false);

    // Holidays & absences
    const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
    const [absenceMap, setAbsenceMap] = useState<Record<string, string>>({});

    // Resumen Mensual state
    const [viewModeBottom, setViewModeBottom] = useState<'detalle' | 'resumen'>('detalle');
    const [resumenAño, setResumenAño] = useState(new Date().getFullYear());
    const [resumenMes, setResumenMes] = useState(new Date().getMonth());
    const [resumenDatos, setResumenDatos] = useState<ResumenMensual | null>(null);
    const [resumenLoading, setResumenLoading] = useState(false);
    const [resumenSearchQuery, setResumenSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, [userId]); // Reload if userId changes

    // Load Resumen data when switching to Resumen view or changing months
    useEffect(() => {
        if (viewModeBottom === 'resumen') {
            cargarResumen();
        }
    }, [resumenAño, resumenMes, viewModeBottom]);

    const cargarResumen = async () => {
        setResumenLoading(true);
        try {
            const result = await getMiHoja(resumenAño, resumenMes);
            setResumenDatos(result);
        } catch (err) {
            console.error('Error cargando resumen:', err);
        } finally {
            setResumenLoading(false);
        }
    };

    const cambiarMesResumen = (delta: number) => {
        let nuevoMes = resumenMes + delta;
        let nuevoAño = resumenAño;
        if (nuevoMes < 0) { nuevoMes = 11; nuevoAño--; }
        else if (nuevoMes > 11) { nuevoMes = 0; nuevoAño++; }
        setResumenMes(nuevoMes);
        setResumenAño(nuevoAño);
    };

    useEffect(() => {
        loadData();
    }, [userId]); // Reload if userId changes

    // Auto-calculate hours from range
    useEffect(() => {
        if (entryMode === 'range' && startTime && endTime) {
            const [h1, m1] = startTime.split(':').map(Number);
            const [h2, m2] = endTime.split(':').map(Number);
            if (!isNaN(h1) && !isNaN(h2)) {
                let diffInMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
                if (diffInMinutes < 0) diffInMinutes += 24 * 60; // Handle overnight
                // Round to 2 decimals
                setHours((diffInMinutes / 60).toFixed(2));
            }
        }
    }, [startTime, endTime, entryMode]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectsData, entriesData] = await Promise.all([
                getActiveProjects(),
                getTimeEntries({ limit: 500, userId })
            ]);
            setProjects(projectsData);
            setEntries(entriesData.entries);

            try {
                const now = new Date();
                const startOfYear = `${now.getFullYear()}-01-01`;
                const endOfYear = `${now.getFullYear()}-12-31`;
                const ha = await getHolidaysAndAbsences(startOfYear, endOfYear);

                const hMap: Record<string, string> = {};
                ha.holidays.forEach(h => { hMap[h.date] = h.name; });
                setHolidayMap(hMap);

                const aMap: Record<string, string> = {};
                const ABSENCE_LABELS: Record<string, string> = {
                    VACATION: 'Vacaciones', SICK_LEAVE: 'Baja Médica',
                    PERSONAL: 'Asuntos Personales', MATERNITY: 'Maternidad',
                    PATERNITY: 'Paternidad', UNPAID: 'Sin Sueldo', OTHER: 'Otro'
                };
                ha.absences.forEach(a => {
                    const start = new Date(a.startDate + 'T12:00:00');
                    const end = new Date(a.endDate + 'T12:00:00');
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const key = d.toISOString().split('T')[0];
                        aMap[key] = ABSENCE_LABELS[a.type] || 'Ausencia';
                    }
                });
                setAbsenceMap(aMap);
            } catch (e) {
                console.error('Error loading holidays/absences:', e);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const today = new Date();

    const entriesByDate = useMemo(() => {
        const grouped: Record<string, TimeEntry[]> = {};
        entries.forEach(entry => {
            const d = new Date(entry.date);
            const dateKey = formatDateKeyUTC(d);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(entry);
        });
        return grouped;
    }, [entries]);

    const getHoursForDate = (dateStr: string) => {
        const dayEntries = entriesByDate[dateStr] || [];
        return dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    };

    const getWeekDays = () => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const getMonthDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        let startPadding = firstDay.getDay() - 1;
        if (startPadding < 0) startPadding = 6;
        for (let i = startPadding; i > 0; i--) {
            const d = new Date(firstDay);
            d.setDate(d.getDate() - i);
            days.push({ date: d, isCurrentMonth: false });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(lastDay);
            d.setDate(d.getDate() + i);
            days.push({ date: d, isCurrentMonth: false });
        }

        return days;
    };

    const navigatePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleDayClick = (date: Date) => {
        const dateStr = formatDateKey(date);
        setSelectedDate(dateStr);
        setFormDate(dateStr);
        setEditingEntry(null);
        setProjectId('');
        setHours('');
        setStartTime('09:00');
        setEndTime('17:00');
        setEntryMode('total');
        setNotes('');
        setIsExtraHours(false);
        setMessage(null);
    };

    const openEditForm = (entry: TimeEntry) => {
        if (readOnly) return;
        setEditingEntry(entry);
        setProjectId(entry.project.id);
        const d = new Date(entry.date);
        setFormDate(formatDateKeyUTC(d));
        setHours(String(Number(entry.hours)));
        const fullEntry = entry as any;
        if (fullEntry.startTime && fullEntry.endTime) {
            setStartTime(fullEntry.startTime);
            setEndTime(fullEntry.endTime);
            setEntryMode('range');
        } else {
            setStartTime('');
            setEndTime('');
            setEntryMode('total');
        }
        setNotes(entry.notes || '');
        setIsExtraHours(entry.isExtraHours === true);
        setMessage(null);
    };

    const cancelEdit = () => {
        setEditingEntry(null);
        setProjectId('');
        setHours('');
        setStartTime('09:00');
        setEndTime('17:00');
        setEntryMode('total');
        setNotes('');
        setIsExtraHours(false);
        setMessage(null);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        if (!projectId || !hours || !formDate) {
            setMessage({ type: 'error', text: 'Completa todos los campos requeridos' });
            return;
        }

        const hoursNum = parseFloat(hours);
        if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
            setMessage({ type: 'error', text: 'Las horas deben estar entre 0.1 y 24' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        const currentDayHours = getHoursForDate(formDate) - (editingEntry ? Number(editingEntry.hours) : 0);
        const totalDayWithNew = currentDayHours + hoursNum;
        
        const payload = {
            projectId,
            date: formDate,
            hours: hoursNum,
            notes: notes || undefined,
            startTime: entryMode === 'range' ? startTime : undefined,
            endTime: entryMode === 'range' ? endTime : undefined,
            userId,
            isExtraHours,
            // Todas las entradas se auto-aprueban por requerimiento del usuario
            status: 'APPROVED' as const,
        };

        try {
            if (editingEntry) {
                const result = await updateTimeEntry(editingEntry.id, payload);
                if (result.success) {
                    setMessage({ type: 'success', text: '✅ Horas actualizadas' });
                    setEditingEntry(null);
                    setProjectId('');
                    setHours('');
                    setNotes('');
                    await loadData();
                    setTimeout(() => setMessage(null), 3000);
                } else {
                    setMessage({ type: 'error', text: 'Error al actualizar horas' });
                }
            } else {
                const result = await createTimeEntry({ ...payload, billable: true });
                if (result.success) {
                    setMessage({ type: 'success', text: '✅ Horas registradas y aprobadas' });
                    setProjectId('');
                    setHours('');
                    setNotes('');
                    await loadData();
                    setTimeout(() => setMessage(null), 5000);
                } else {
                    setMessage({ type: 'error', text: 'Error al registrar horas' });
                }
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error al guardar horas' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (readOnly) return;
        if (!confirm('¿Eliminar esta entrada de horas?')) return;
        try {
            const result = await deleteTimeEntry(id);
            if (result.success) {
                if (editingEntry?.id === id) {
                    cancelEdit();
                }
                await loadData();
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
        }
    };

    const getStatusBadge = (entry: TimeEntry, cumulativeBefore: number) => {
        // Mostrar estado si es hora extra
        if (entry.isExtraHours) {
            if (entry.status === 'SUBMITTED') {
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0 shadow-sm">Pendiente</span>;
            }
            if (entry.status === 'APPROVED') {
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0 shadow-sm">Aprobado</span>;
            }
            if (entry.status === 'REJECTED') {
                return <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 shrink-0 shadow-sm">Rechazado</span>;
            }
        }
        return null;
    };

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const weekDays = getWeekDays();
    const monthDays = getMonthDays();

    const isTodayFn = (date: Date) => {
        const t = new Date();
        return date.toDateString() === t.toDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
                    <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 lg:h-[calc(100dvh-7.5rem)]">
            {/* Title row */}
            {!userId && (
                <div className="flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-olive-600 dark:text-olive-500" />
                        Registro Diario
                    </h2>
                </div>
            )}

            {message && (
                <div className={`p-2.5 rounded-xl text-sm font-bold shrink-0 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-900/50'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-900/50'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* ── TOP SECTION: Form & Daily List ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 shrink-0 lg:h-[60%] min-h-0 overflow-hidden">
                {/* Form */}
                {!readOnly && (
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col overflow-hidden h-full">
                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-olive-50/30 dark:bg-olive-900/10 flex items-center justify-between shrink-0">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                <div className="p-1.5 bg-olive-100 dark:bg-olive-900/30 rounded-md text-olive-600 dark:text-olive-400">
                                    {editingEntry ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                                {editingEntry ? 'Editar Entrada' : 'Entradas'}
                            </h3>
                            {editingEntry && (
                                <button type="button" onClick={cancelEdit} className="text-xs font-bold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-2 h-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Proyecto *</label>
                                        <SearchableSelect
                                            required
                                            placeholder="Seleccionar proyecto..."
                                            searchPlaceholder="Buscar por código o nombre..."
                                            options={projects.map(p => ({
                                                value: p.id,
                                                label: p.code,
                                                subLabel: p.name
                                            }))}
                                            value={projectId}
                                            onChange={(val) => setProjectId(val)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Fecha *</label>
                                        <input
                                            type="date"
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 text-sm font-medium transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Modo Entrada</label>
                                        <div className="bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg flex">
                                            <button
                                                type="button"
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${entryMode === 'total' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700'}`}
                                                onClick={() => setEntryMode('total')}
                                            >
                                                Total
                                            </button>
                                            <button
                                                type="button"
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${entryMode === 'range' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700'}`}
                                                onClick={() => setEntryMode('range')}
                                            >
                                                Rango
                                            </button>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        {entryMode === 'total' ? (
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Horas *</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0.1"
                                                    max="24"
                                                    value={hours}
                                                    onChange={(e) => setHours(e.target.value)}
                                                    placeholder="Ej: 8"
                                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 text-sm font-medium transition-all"
                                                    required={entryMode === 'total'}
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Entrada</label>
                                                    <input
                                                        type="time"
                                                        value={startTime}
                                                        onChange={(e) => setStartTime(e.target.value)}
                                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 text-sm font-medium transition-all"
                                                        required={entryMode === 'range'}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Salida</label>
                                                    <input
                                                        type="time"
                                                        value={endTime}
                                                        onChange={(e) => setEndTime(e.target.value)}
                                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 text-sm font-medium transition-all"
                                                        required={entryMode === 'range'}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">Notas</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-olive-500/10 focus:border-olive-500 outline-none resize-none text-neutral-900 dark:text-neutral-100 text-sm font-medium placeholder-neutral-400 transition-all font-medium"
                                        placeholder="Describe tu actividad..."
                                    />
                                </div>

                                <div className="mt-auto pt-2 flex items-center justify-between">
                                    <div 
                                        onClick={() => setIsExtraHours(!isExtraHours)}
                                        className="flex items-center gap-2 py-1 px-1 cursor-pointer group w-fit hover:opacity-80 transition-opacity"
                                    >
                                        <div className="relative flex items-center">
                                            <div className={`w-8 h-4 rounded-full transition-colors ${isExtraHours ? 'bg-olive-600' : 'bg-neutral-300 dark:bg-neutral-600'}`}></div>
                                            <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isExtraHours ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-olive-600 transition-colors flex items-center gap-1">
                                            Horas Extras (Remuneradas)
                                            {isExtraHours && <span className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-pulse"></span>}
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 font-bold shadow-md shadow-olive-600/20 active:scale-[0.98] transition-all text-sm"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {submitting ? 'Guardando...' : (editingEntry ? 'Actualizar Registro' : 'Añadir Registro')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Day List */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col overflow-hidden h-full">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-lg text-neutral-500">
                                <FileText className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="text-xs font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total</span>
                            <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md text-xs font-black border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                {getHoursForDate(selectedDate)}h
                            </span>
                        </div>
                    </div>

                    <div className="p-3 flex-1 overflow-y-auto">
                        {(entriesByDate[selectedDate] || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-10">
                                <Clock className="w-8 h-8 text-neutral-300 mb-2" />
                                <p className="text-sm font-bold text-neutral-400">Sin registros para este día</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {(() => {
                                    let runningTotal = 0;
                                    return (entriesByDate[selectedDate] || []).map(entry => {
                                        const badge = getStatusBadge(entry, runningTotal);
                                        runningTotal += Number(entry.hours);
                                        return (
                                            <div key={entry.id} className="group flex items-center gap-3 p-2.5 bg-neutral-50/50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-700/50 rounded-xl hover:bg-white dark:hover:bg-neutral-800 hover:border-olive-500/30 hover:shadow-sm transition-all">
                                                {/* Hours - LARGE */}
                                                <div className="shrink-0 text-lg font-black text-neutral-900 dark:text-neutral-100 min-w-[3rem] text-center">
                                                    {Number(entry.hours)}h
                                                </div>

                                                {/* Project code badge - OLIVE */}
                                                <span className="shrink-0 px-2 py-0.5 bg-olive-500 text-white font-bold text-[10px] rounded-lg shadow-sm uppercase">
                                                    {entry.project.code}
                                                </span>

                                                {/* Project name + Note */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">{entry.project.name}</p>
                                                    {entry.notes && <p className="text-[10px] text-neutral-500 truncate mt-0.5">{entry.notes}</p>}
                                                </div>

                                                {/* Status */}
                                                <div className="shrink-0">
                                                    {badge}
                                                </div>

                                                {/* Actions */}
                                                {!readOnly && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {entry.status === 'SUBMITTED' && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    approveTimeEntries([entry.id]).then(() => loadData());
                                                                }} 
                                                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all" 
                                                                title="Aprobar mis horas"
                                                            >
                                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => openEditForm(entry)} className="p-1.5 text-neutral-400 hover:text-olive-600 hover:bg-olive-50 dark:hover:bg-olive-900/20 rounded-lg transition-all" title="Editar">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Eliminar">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── BOTTOM SECTION: Calendar & Highlights ── */}
            <div className="flex-1 min-h-0 flex flex-col gap-2">

                {/* ── CENTER: Calendar / Resumen ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Toggle + Nav controls */}
                    <div className="shrink-0 flex items-center justify-between gap-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 shadow-sm">
                        {/* Detalle / Resumen toggle */}
                        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
                            <button
                                onClick={() => setViewModeBottom('detalle')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-bold ${viewModeBottom === 'detalle'
                                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-olive-600 dark:text-olive-400'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                                    }`}
                            >
                                <List size={13} />
                                Detalle
                            </button>
                            <button
                                onClick={() => setViewModeBottom('resumen')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-bold ${viewModeBottom === 'resumen'
                                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-olive-600 dark:text-olive-400'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                                    }`}
                            >
                                <Eye size={13} />
                                Resumen
                            </button>
                        </div>

                        {/* Calendar nav - only visible in Detalle mode */}
                        {viewModeBottom === 'detalle' && (
                            <div className="flex items-center gap-1.5">
                                <button onClick={navigatePrevious} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 transition-colors" aria-label="Anterior">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg min-w-[150px] justify-center border border-neutral-100 dark:border-neutral-800">
                                    <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
                                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                                        {viewMode === 'week'
                                            ? `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
                                            : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                                        }
                                    </span>
                                </div>
                                <button onClick={navigateNext} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400 transition-colors" aria-label="Siguiente">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Period hours + Week/Month toggle - only visible in Detalle */}
                        {viewModeBottom === 'detalle' && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={goToToday} 
                                    className="flex items-center gap-1 px-3 py-1 bg-olive-500 text-white rounded-lg hover:bg-olive-600 transition-all shadow-sm shadow-olive-500/20 border border-olive-400/30" 
                                    title="Total periodo / Ir a hoy"
                                >
                                    <span className="text-xs font-black">
                                        {viewMode === 'week'
                                            ? `${weekDays.reduce((sum, d) => sum + getHoursForDate(formatDateKey(d)), 0)}h`
                                            : `${monthDays.filter(({ isCurrentMonth }) => isCurrentMonth).reduce((sum, { date }) => sum + getHoursForDate(formatDateKey(date)), 0)}h`
                                        }
                                    </span>
                                </button>
                                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700/50">
                                    <button
                                        onClick={() => setViewMode('week')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'week'
                                            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100'
                                            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                                            }`}
                                    >
                                        Semana
                                    </button>
                                    <button
                                        onClick={() => setViewMode('month')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month'
                                            ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100'
                                            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                                            }`}
                                    >
                                        Mes
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Calendar or Resumen content */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        {viewModeBottom === 'detalle' ? (
                            <div className="h-full flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                {/* Week View */}
                                {viewMode === 'week' && (
                                    <div className="flex-1 grid grid-cols-7 divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                        {weekDays.map((day: Date, idx: number) => {
                                            const dateStr = formatDateKey(day);
                                            const dayHours = getHoursForDate(dateStr);
                                            const dayEntries = entriesByDate[dateStr] || [];
                                            const isTodayDate = isTodayFn(day);
                                            const isSelected = selectedDate === dateStr;

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleDayClick(day)}
                                                    className={`flex flex-col cursor-pointer transition-all overflow-hidden ${isTodayDate ? 'bg-olive-50/30 dark:bg-olive-900/10' : 'bg-white dark:bg-neutral-900'
                                                        } ${isSelected ? 'ring-2 ring-inset ring-olive-500 bg-olive-50/50 dark:bg-olive-900/20' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800/80 group`}
                                                >
                                                    <div className="text-center py-2 px-1 border-b border-neutral-100 dark:border-neutral-800/50 shrink-0">
                                                        <p className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{WEEKDAYS[idx]}</p>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-all ${isTodayDate ? 'bg-olive-600 text-white shadow-md shadow-olive-600/30' : 'text-neutral-700 dark:text-neutral-300 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800'}`}>
                                                            {day.getDate()}
                                                        </div>
                                                        {dayHours > 0 && (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[9px] font-bold rounded-md">
                                                                {dayHours}h
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 p-1 overflow-y-auto">
                                                        {dayEntries.map(entry => (
                                                            <div key={entry.id} className="text-[9px] p-1 mb-1 bg-white dark:bg-neutral-800 border-l-[2px] border-l-olive-500 border border-neutral-100 dark:border-neutral-700 rounded-r-md shadow-sm truncate flex justify-between items-center">
                                                                <span className="text-olive-700 dark:text-olive-400 font-extrabold truncate pr-1">{entry.project.code}</span>
                                                                <span className="shrink-0 text-neutral-500 dark:text-neutral-400 font-bold">{Number(entry.hours)}h</span>
                                                            </div>
                                                        ))}
                                                        {holidayMap[dateStr] && (
                                                            <div className="text-[8px] p-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold rounded flex items-center gap-1 mb-1">
                                                                <span>🎉</span> <span className="truncate">{holidayMap[dateStr]}</span>
                                                            </div>
                                                        )}
                                                        {absenceMap[dateStr] && (
                                                            <div className="text-[8px] p-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded flex items-center gap-1 mb-1">
                                                                <span>🏖️</span> <span className="truncate">{absenceMap[dateStr]}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Month View */}
                                {viewMode === 'month' && (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
                                            {WEEKDAYS.map(day => (
                                                <div key={day} className="py-2 text-center text-[9px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex-1 grid grid-cols-7 bg-neutral-200 dark:bg-neutral-800 gap-[1px] overflow-hidden">
                                            {monthDays.map(({ date, isCurrentMonth }: { date: Date; isCurrentMonth: boolean }, idx: number) => {
                                                const dateStr = formatDateKey(date);
                                                const dayHours = getHoursForDate(dateStr);
                                                const isTodayDate = isTodayFn(date);
                                                const isSelected = selectedDate === dateStr;

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleDayClick(date)}
                                                        className={`p-1 bg-white dark:bg-neutral-900 cursor-pointer transition-all relative flex flex-col ${!isCurrentMonth ? 'opacity-40' : ''
                                                            } ${isSelected ? 'ring-2 ring-inset ring-olive-500 z-10 bg-olive-50/30' : ''
                                                            } hover:bg-neutral-50 dark:hover:bg-neutral-800`}
                                                    >
                                                        <div className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-olive-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                            {date.getDate()}
                                                        </div>
                                                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                                                            {(entriesByDate[dateStr] || []).slice(0, 3).map((e, i) => (
                                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-olive-500" title={e.project.code}></div>
                                                            ))}
                                                        </div>
                                                        {dayHours > 0 && (
                                                            <div className="mt-auto">
                                                                <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400">{dayHours}h</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                                                            {holidayMap[dateStr] && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title={holidayMap[dateStr]}></span>}
                                                            {absenceMap[dateStr] && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={absenceMap[dateStr]}></span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Resumen Mensual View */
                            <div className="h-full overflow-y-auto space-y-3">
                                {/* Resumen Month Selector */}
                                <div className="flex items-center justify-center gap-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                                    <button onClick={() => cambiarMesResumen(-1)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="text-center min-w-[180px]">
                                        <h2 className="text-lg font-bold">{MESES[resumenMes]} {resumenAño}</h2>
                                        {resumenDatos && <p className="text-xs text-neutral-500">{resumenDatos.diasLaborables} días laborables</p>}
                                    </div>
                                    <button onClick={() => cambiarMesResumen(1)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                {resumenLoading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <div className="w-6 h-6 border-3 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : resumenDatos ? (
                                    <>
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 shadow-sm">
                                                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-medium mb-1">
                                                    <div className="p-0.5 bg-olive-100 dark:bg-olive-900/30 text-olive-600 dark:text-olive-400 rounded-md"><Clock size={12} /></div>
                                                    Horas Reales
                                                </div>
                                                <div className="text-xl font-black text-olive-600 dark:text-olive-500">{formatHoras(resumenDatos.horasReales)}</div>
                                            </div>
                                            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 shadow-sm">
                                                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-medium mb-1">
                                                    <div className="p-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-md"><CalendarIcon size={12} /></div>
                                                    Previstas
                                                </div>
                                                <div className="text-xl font-bold text-neutral-700 dark:text-neutral-200">{formatHoras(resumenDatos.horasPrevistas)}</div>
                                            </div>
                                            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 shadow-sm">
                                                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-medium mb-1">
                                                    <div className={`p-0.5 rounded-md ${resumenDatos.diferencia >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {resumenDatos.diferencia >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    </div>
                                                    Diferencia
                                                </div>
                                                <div className={`text-xl font-bold ${getColorDiferencia(resumenDatos.diferencia)}`}>{formatDiferencia(resumenDatos.diferencia)}</div>
                                            </div>
                                            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 shadow-sm">
                                                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-medium mb-1">
                                                    <div className="p-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-md"><AlertTriangle size={12} /></div>
                                                    Sin Imputar
                                                </div>
                                                <div className={`text-xl font-bold ${getColorDiasSinImputar(resumenDatos.diasSinImputar).text}`}>
                                                    {resumenDatos.diasSinImputar} <span className="text-[10px] font-normal text-neutral-400">días</span>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 shadow-sm">
                                                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-medium mb-1">
                                                    <div className={`p-0.5 rounded-md ${resumenDatos.porcentajeCumplimiento >= 100 ? 'bg-green-100 text-green-600' : resumenDatos.porcentajeCumplimiento >= 80 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                                        <TrendingUp size={12} />
                                                    </div>
                                                    Cumplimiento
                                                </div>
                                                <div className={`text-xl font-bold ${resumenDatos.porcentajeCumplimiento >= 100 ? 'text-green-600' : resumenDatos.porcentajeCumplimiento >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {resumenDatos.porcentajeCumplimiento}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detalle Diario */}
                                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                                            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50/50 dark:bg-neutral-800/20">
                                                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                                    <CalendarIcon className="w-3.5 h-3.5 text-olive-600" />
                                                    Detalle Diario
                                                </h3>
                                                <div className="relative w-full sm:w-auto">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar proyecto, nota..."
                                                        value={resumenSearchQuery}
                                                        onChange={(e) => setResumenSearchQuery(e.target.value)}
                                                        className="w-full sm:w-64 pl-8 pr-7 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                                    />
                                                    {resumenSearchQuery && (
                                                        <button onClick={() => setResumenSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="hidden md:grid grid-cols-10 bg-neutral-100/50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                                <div className="col-span-1 px-3 py-2 text-center">Día</div>
                                                <div className="col-span-1 px-3 py-2 text-center">Semana</div>
                                                <div className="col-span-6 px-3 py-2">Proyectos</div>
                                                <div className="col-span-2 px-3 py-2 text-center">Total</div>
                                            </div>

                                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                                {resumenDatos.diasDelMes
                                                    .filter(dia => {
                                                        if (!resumenSearchQuery) return true;
                                                        const query = resumenSearchQuery.toLowerCase();
                                                        return dia.horasPorProyecto.some(
                                                            p => p.projectCode.toLowerCase().includes(query) ||
                                                                (p.projectName && p.projectName.toLowerCase().includes(query))
                                                        ) || dia.notas.some(n => n.toLowerCase().includes(query));
                                                    })
                                                    .map((dia) => (
                                                        <div key={dia.dia} className={`group md:grid md:grid-cols-10 items-center transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${!dia.esLaborable ? 'bg-neutral-50/50 dark:bg-neutral-900/50' : 'bg-white dark:bg-neutral-900'}`}>
                                                            <div className="flex md:hidden items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/30">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{dia.dia}</span>
                                                                    <span className="text-sm text-neutral-500">{dia.diaSemanaLabel}</span>
                                                                </div>
                                                                <div className="font-bold">{dia.totalHoras > 0 ? formatHoras(dia.totalHoras) : '-'}</div>
                                                            </div>
                                                            <div className="hidden md:block col-span-1 px-3 py-2 text-center">
                                                                <div className={`w-6 h-6 mx-auto flex items-center justify-center rounded-full font-bold text-[10px] ${dia.estado === 'vacio' && dia.esLaborable ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                                    {dia.dia}
                                                                </div>
                                                            </div>
                                                            <div className="hidden md:block col-span-1 px-3 py-2 text-center text-[10px] font-medium text-neutral-500">
                                                                {dia.diaSemanaLabel.slice(0, 3)}
                                                            </div>
                                                            <div className="col-span-12 md:col-span-6 px-3 py-2">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {dia.horasPorProyecto.length > 0 ? (
                                                                        dia.horasPorProyecto.map((p, idx) => (
                                                                            <div key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-olive-50 dark:bg-olive-900/20 border border-olive-100 dark:border-olive-900/30 text-[10px] font-semibold text-olive-700 dark:text-olive-300">
                                                                                <span className="opacity-70">{p.projectCode}:</span>
                                                                                <span>{p.hours}h</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-[10px] text-neutral-400 italic">
                                                                            {dia.esAusencia
                                                                                ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md font-semibold not-italic">🏖️ {ABSENCE_TYPE_LABELS[dia.tipoAusencia || ''] || 'Ausencia'}</span>
                                                                                : dia.esFestivo
                                                                                    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md font-semibold not-italic">🎉 {dia.nombreFestivo || 'Festivo'}</span>
                                                                                    : !dia.esLaborable ? 'No laborable' : 'Sin actividad'
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {dia.notas.length > 0 && (
                                                                    <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{dia.notas.join('. ')}</p>
                                                                )}
                                                            </div>
                                                            <div className="hidden md:block col-span-2 px-3 py-2 text-center">
                                                                <span className={`font-bold text-xs ${dia.totalHoras >= 8 ? 'text-green-600 dark:text-green-400' : dia.totalHoras > 0 ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-700'}`}>
                                                                    {dia.totalHoras > 0 ? formatHoras(dia.totalHoras) : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Distribución por Proyecto */}
                                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 shadow-sm">
                                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                                <HardHat className="w-3.5 h-3.5 text-neutral-500" />
                                                Distribución por Proyecto
                                            </h3>
                                            <div className="space-y-2.5">
                                                {resumenDatos.totalesPorProyecto.map((proyecto) => {
                                                    const percentage = Math.min(100, Math.round((proyecto.hours / resumenDatos.horasReales) * 100));
                                                    return (
                                                        <div key={proyecto.projectId}>
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-900 dark:text-neutral-100">{proyecto.projectCode}</span>
                                                                    <span className="text-[10px] text-neutral-500 truncate max-w-[150px]">{proyecto.projectName}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-bold text-[10px] text-neutral-900 dark:text-neutral-100">{formatHoras(proyecto.hours)}</span>
                                                                    <span className="text-[9px] text-neutral-400 ml-1">({percentage}%)</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-olive-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {resumenDatos.totalesPorProyecto.length === 0 && (
                                                    <div className="text-center py-6 text-neutral-500 text-sm">No hay horas registradas este mes</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-neutral-500">No hay datos disponibles para este mes.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
