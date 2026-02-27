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
    AlertCircle
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
    startTime?: string | null;
    endTime?: string | null;
    project: {
        id: string;
        code: string;
        name: string;
    };
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

export default function DailyHoursView({ userId, readOnly = false }: DailyHoursViewProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

    // Form state
    const [projectId, setProjectId] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [hours, setHours] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [entryMode, setEntryMode] = useState<'total' | 'range'>('total');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Holidays & absences
    const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
    const [absenceMap, setAbsenceMap] = useState<Record<string, string>>({});


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
            // If readOnly, we might not need projects unless we want to filter/display metadata
            // But we do need entries for the specific userId
            const [projectsData, entriesData] = await Promise.all([
                getActiveProjects(), // This might need to filtered if we only want assigned projects
                getTimeEntries({ limit: 500, userId })
            ]);
            setProjects(projectsData);
            setEntries(entriesData.entries);

            // Load holidays and absences for the visible range (current year)
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
                    VACATION: 'Vacaciones', SICK_LEAVE: 'Baja M\u00e9dica',
                    PERSONAL: 'Asuntos Personales', MATERNITY: 'Maternidad',
                    PATERNITY: 'Paternidad', UNPAID: 'Sin Sueldo', OTHER: 'Otro'
                };
                ha.absences.forEach(a => {
                    // Expand date range into individual dates
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

    // Current date reference for today button and defaults
    const today = new Date();

    // Get entries grouped by date
    const entriesByDate = useMemo(() => {
        const grouped: Record<string, TimeEntry[]> = {};
        entries.forEach(entry => {
            const d = new Date(entry.date);
            const dateKey = d.toISOString().split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(entry);
        });
        return grouped;
    }, [entries]);

    // Get hours total for a specific date
    const getHoursForDate = (dateStr: string) => {
        const dayEntries = entriesByDate[dateStr] || [];
        return dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    };

    // Calculate week days
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

    // Calculate month days
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

    // Helper to format date key locally YYYY-MM-DD
    const formatDateKey = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleDayClick = (date: Date) => {
        const dateStr = formatDateKey(date);
        setSelectedDate(selectedDate === dateStr ? null : dateStr);
        // Only update form date if we are going to use it, but safe to update state
        setFormDate(dateStr);
    };

    const openNewForm = (date?: string) => {
        if (readOnly) return;
        setEditingEntry(null);
        setProjectId('');
        setFormDate(date || formatDateKey(today));
        setHours('');
        setStartTime('09:00');
        setEndTime('17:00');
        setEntryMode('total');
        setNotes('');
        setMessage(null);
        setShowForm(true);
    };

    const openEditForm = (entry: TimeEntry) => {
        if (readOnly) return;
        setEditingEntry(entry);
        setProjectId(entry.project.id);
        const d = new Date(entry.date);
        setFormDate(d.toISOString().split('T')[0]);
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
        setMessage(null);
        setShowForm(true);
    };

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

        const payload = {
            projectId,
            date: formDate,
            hours: hoursNum,
            notes: notes || undefined,
            startTime: entryMode === 'range' ? startTime : undefined,
            endTime: entryMode === 'range' ? endTime : undefined,
            userId, // Though createTimeEntry typically uses session user, we might need adjustments if admins are creating for others (out of scope for now, usually creating is for oneself)
        };

        try {
            if (editingEntry) {
                const result = await updateTimeEntry(editingEntry.id, payload);
                if (result.success) {
                    setMessage({ type: 'success', text: '✅ Horas actualizadas' });
                    setShowForm(false);
                    setEditingEntry(null);
                    await loadData();
                    setTimeout(() => setMessage(null), 3000);
                } else {
                    setMessage({ type: 'error', text: 'Error al actualizar horas' });
                }
            } else {
                const result = await createTimeEntry({ ...payload, billable: true });
                if (result.success) {
                    setMessage({ type: 'success', text: '✅ Horas registradas' });
                    setShowForm(false);
                    await loadData();
                    setTimeout(() => setMessage(null), 3000);
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
                await loadData();
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
        }
    };

    // Bulk actions removed as per user request

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">Borrador</span>;
            case 'SUBMITTED':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pendiente</span>;
            case 'APPROVED':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aprobado</span>;
            case 'REJECTED':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rechazado</span>;
            default:
                return null;
        }
    };

    // Calculate totals
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const weekDays = getWeekDays();
    const monthDays = getMonthDays();

    const isToday = (date: Date) => {
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
        <div className="space-y-6">
            {/* Header - Only show if separate page or distinct header needed. For embedded view, maybe skip large header? 
               The original page had a header. We will respect the original design but hide "Registrar Horas" if readOnly.
            */}

            {/* If embedded, the parent might render the header. 
                But let's include it for now to match the "Registro Diario" exact look. 
                We can make it conditional or smaller. 
            */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    {!userId && (
                        // Only show Title if we are NOT in a context where title is provided by parent (like User selector).
                        // Actually the requirement is "la que ve el user en el Registro Diario", so we should keep it similar.
                        <>
                            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                <Clock className="w-8 h-8 text-olive-600 dark:text-olive-500" />
                                Registro de Horas
                            </h2>
                            <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                                Visualiza y registra tus horas de trabajo
                            </p>
                        </>
                    )}
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => openNewForm()}
                            className="flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-xl hover:bg-olive-700 transition-all font-bold shadow-lg shadow-olive-600/20"
                        >
                            <Plus className="w-5 h-5" />
                            Registrar Horas
                        </button>
                    </div>
                )}
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg font-bold ${message.type === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                    }`}>
                    {message.text}
                </div>
            )}



            {/* Calendar Controls */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/30">
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-2 rounded-lg transition-all text-sm font-bold ${viewMode === 'week'
                                ? 'bg-white dark:bg-neutral-700 shadow-sm text-olive-600 dark:text-olive-400'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                                }`}
                        >
                            Semanal
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-2 rounded-lg transition-all text-sm font-bold ${viewMode === 'month'
                                ? 'bg-white dark:bg-neutral-700 shadow-sm text-olive-600 dark:text-olive-400'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                                }`}
                        >
                            Mensual
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={navigatePrevious} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-black text-neutral-900 dark:text-neutral-100 min-w-[200px] text-center tracking-tight">
                            {viewMode === 'week'
                                ? `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
                                : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                            }
                        </span>
                        <button onClick={navigateNext} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        {(() => {
                            // Calculate total for the visible period
                            let periodTotal = 0;
                            if (viewMode === 'week') {
                                weekDays.forEach((day: Date) => {
                                    periodTotal += getHoursForDate(formatDateKey(day));
                                });
                            } else {
                                monthDays.forEach(({ date, isCurrentMonth }: { date: Date; isCurrentMonth: boolean }) => {
                                    if (isCurrentMonth) {
                                        periodTotal += getHoursForDate(formatDateKey(date));
                                    }
                                });
                            }
                            return periodTotal > 0 ? (
                                <span className="ml-2 px-2.5 py-1 text-xs font-black bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 rounded-lg">
                                    {periodTotal.toFixed(1)}h
                                </span>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* Week View */}
                {viewMode === 'week' && (
                    <div className="grid grid-cols-7 divide-x divide-neutral-200 dark:divide-neutral-800">
                        {weekDays.map((day: Date, idx: number) => {
                            const dateStr = formatDateKey(day);
                            const dayHours = getHoursForDate(dateStr);
                            const dayEntries = entriesByDate[dateStr] || [];
                            const isTodayDate = isToday(day);
                            const isSelected = selectedDate === dateStr;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleDayClick(day)}
                                    className={`min-h-[220px] p-3 cursor-pointer transition-all ${isTodayDate ? 'bg-olive-50/50 dark:bg-olive-900/10' : ''
                                        } ${isSelected ? 'ring-2 ring-inset ring-olive-500 bg-olive-50/30 dark:bg-olive-900/20' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group`}
                                >
                                    <div className="text-center mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/50 group-hover:border-neutral-200 dark:group-hover:border-neutral-700 transition-colors">
                                        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{WEEKDAYS[idx]}</p>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto text-sm font-bold transition-all ${isTodayDate ? 'bg-olive-600 text-white shadow-lg shadow-olive-600/30 scale-110' : 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800'}`}>
                                            {day.getDate()}
                                        </div>
                                        {dayHours > 0 && (
                                            <span className="inline-block mt-2 px-2.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold rounded-md">
                                                {dayHours}h
                                            </span>
                                        )}
                                        {holidayMap[dateStr] && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[9px] font-bold rounded-md truncate max-w-full">
                                                🎉 {holidayMap[dateStr]}
                                            </span>
                                        )}
                                        {absenceMap[dateStr] && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded-md truncate max-w-full">
                                                🏖️ {absenceMap[dateStr]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {dayEntries.slice(0, 3).map(entry => (
                                            <div key={entry.id} className="text-[10px] p-2 bg-white dark:bg-neutral-800 border-l-2 border-l-olive-500 border-y border-r border-neutral-100 dark:border-neutral-700 rounded-r-md text-neutral-600 dark:text-neutral-300 shadow-sm truncate font-medium hover:scale-[1.02] transition-transform">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-olive-700 dark:text-olive-400 font-extrabold">{entry.project.code}</span>
                                                    <span>{Number(entry.hours)}h</span>
                                                </div>
                                                {entry.project.name && <div className="truncate opacity-70 mt-0.5 font-normal">{entry.project.name}</div>}
                                            </div>
                                        ))}
                                        {dayEntries.length > 3 && (
                                            <p className="text-[10px] text-center font-bold text-neutral-400 dark:text-neutral-500 py-1 bg-neutral-50 dark:bg-neutral-800/50 rounded-md">
                                                +{dayEntries.length - 3} más
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Month View */}
                {viewMode === 'month' && (
                    <div>
                        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-neutral-100 dark:bg-neutral-800 gap-[1px] border-b border-neutral-200 dark:border-neutral-800">
                            {monthDays.map(({ date, isCurrentMonth }: { date: Date; isCurrentMonth: boolean }, idx: number) => {
                                const dateStr = formatDateKey(date);
                                const dayHours = getHoursForDate(dateStr);
                                const isTodayDate = isToday(date);
                                const isSelected = selectedDate === dateStr;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(date)}
                                        className={`min-h-[100px] p-2 bg-white dark:bg-neutral-900 cursor-pointer transition-all relative ${!isCurrentMonth ? 'opacity-40 bg-neutral-50/50 dark:bg-neutral-900/50' : ''
                                            } ${isSelected ? 'ring-2 ring-inset ring-olive-500 z-10' : ''
                                            } hover:bg-neutral-50 dark:hover:bg-neutral-800`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-olive-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                {date.getDate()}
                                            </p>
                                            <div className="flex flex-col items-end gap-0.5">
                                                {dayHours > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 text-[10px] font-bold rounded-md">
                                                        {dayHours}h
                                                    </span>
                                                )}
                                                {holidayMap[dateStr] && (
                                                    <span className="px-1 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-500 text-[8px] font-bold rounded" title={holidayMap[dateStr]}>
                                                        🎉
                                                    </span>
                                                )}
                                                {absenceMap[dateStr] && (
                                                    <span className="px-1 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 text-[8px] font-bold rounded" title={absenceMap[dateStr]}>
                                                        🏖️
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Dots for entries */}
                                        <div className="mt-2 flex flex-wrap gap-1 content-start">
                                            {(entriesByDate[dateStr] || []).slice(0, 5).map((e, i) => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-olive-400 dark:bg-olive-600"></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Day Details */}
            {selectedDate && (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-olive-100 dark:bg-olive-900/30 p-2 rounded-xl text-olive-600 dark:text-olive-400">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                                    {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <p className="text-sm text-neutral-500">Detalle de registros del día</p>
                            </div>
                        </div>
                        {!readOnly && (
                            <button
                                onClick={() => openNewForm(selectedDate)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-olive-600 text-white rounded-xl hover:bg-olive-700 text-sm font-bold shadow-lg shadow-olive-600/20 active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir Entrada
                            </button>
                        )}
                    </div>
                    {(entriesByDate[selectedDate] || []).length === 0 ? (
                        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                            </div>
                            <p className="text-neutral-900 dark:text-neutral-300 font-bold mb-1">Día sin imputaciones</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay horas registradas para este día</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(entriesByDate[selectedDate] || []).map(entry => (
                                <div key={entry.id} className="group flex items-start gap-4 p-5 bg-white dark:bg-neutral-800 border rounded-2xl hover:shadow-md transition-all border-neutral-200 dark:border-neutral-700 hover:border-olive-300 dark:hover:border-olive-700">

                                    {/* Checkbox removed as per user request */}

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-black text-sm rounded-lg border border-neutral-200 dark:border-neutral-700">
                                                {entry.project.code}
                                            </span>
                                        </div>

                                        <h4 className="text-neutral-900 dark:text-neutral-100 font-bold text-lg leading-tight mb-1">
                                            {entry.project.name}
                                        </h4>

                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span className="font-bold text-neutral-700 dark:text-neutral-300">{Number(entry.hours)} horas</span>
                                            </div>
                                            {entry.startTime && entry.endTime && (
                                                <div className="flex items-center gap-1.5 pl-4 border-l border-neutral-200 dark:border-neutral-700">
                                                    <span className="text-xs font-mono">{entry.startTime} - {entry.endTime}</span>
                                                </div>
                                            )}
                                        </div>

                                        {entry.notes && (
                                            <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 italic">
                                                "{entry.notes}"
                                            </div>
                                        )}
                                    </div>

                                    {!readOnly && (
                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditForm(entry)}
                                                className="p-2 text-neutral-400 hover:text-olive-600 hover:bg-olive-50 dark:hover:bg-olive-900/20 rounded-xl transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Form Modal */}
            {showForm && !readOnly && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                                {editingEntry ? 'Editar Registro' : 'Registrar Horas'}
                            </h3>
                            <button onClick={() => { setShowForm(false); setEditingEntry(null); }} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <SearchableSelect
                                    label="Proyecto"
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
                                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Fecha *</label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-4 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                    required
                                />
                            </div>

                            {/* Entry Mode Toggle */}
                            <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex">
                                <button
                                    type="button"
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${entryMode === 'total' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'}`}
                                    onClick={() => setEntryMode('total')}
                                >
                                    Total Horas
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${entryMode === 'range' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'}`}
                                    onClick={() => setEntryMode('range')}
                                >
                                    Rango Horario
                                </button>
                            </div>

                            {entryMode === 'total' ? (
                                <div>
                                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Total Horas *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="24"
                                        value={hours}
                                        onChange={(e) => setHours(e.target.value)}
                                        placeholder="Ej: 8"
                                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-4 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                        required={entryMode === 'total'}
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Entrada</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-4 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                            required={entryMode === 'range'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Salida</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-4 focus:ring-olive-500/10 focus:border-olive-500 outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                                            required={entryMode === 'range'}
                                        />
                                    </div>
                                    <div className="col-span-2 text-right text-xs font-bold text-neutral-500">
                                        Calculado: {hours || 0}h
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Notas (opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-4 focus:ring-olive-500/10 focus:border-olive-500 outline-none resize-none text-neutral-900 dark:text-neutral-100 font-medium placeholder-neutral-400"
                                    placeholder="Describe lo que hiciste..."
                                />
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success'
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingEntry(null); }}
                                    className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-olive-600 text-white rounded-xl hover:bg-olive-700 disabled:opacity-50 font-bold shadow-lg shadow-olive-600/20 transition-all"
                                >
                                    {submitting ? 'Guardando...' : (editingEntry ? 'Actualizar' : 'Guardar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
