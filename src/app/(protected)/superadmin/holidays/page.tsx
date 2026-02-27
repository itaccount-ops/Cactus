'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Copy, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
    getAllHolidays,
    createHoliday,
    deleteHoliday,
    initializeBaseHolidays,
    copyHolidaysToYear,
    deleteHolidaysForYear
} from './actions';

const HOLIDAY_TYPES = [
    { id: 'NATIONAL', label: 'Nacional', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { id: 'REGIONAL', label: 'Regional', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'LOCAL', label: 'Local', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'COMPANY', label: 'Empresa', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
];

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type Holiday = {
    id: string;
    date: Date;
    name: string;
    type: string;
    year: number;
    companyId: string | null;
};

export default function HolidaysPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showInitModal, setShowInitModal] = useState(false);

    // Form state
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('NATIONAL');
    const [copyToYear, setCopyToYear] = useState(year + 1);

    // Init Base Calendar state
    const [initYear, setInitYear] = useState(year);
    const [initCountry, setInitCountry] = useState<'ES' | 'CA'>('ES');

    useEffect(() => {
        loadHolidays();
    }, [year]);

    const loadHolidays = async () => {
        setLoading(true);
        try {
            const data = await getAllHolidays(year);
            setHolidays(data);
        } catch (err) {
            console.error('Error loading holidays:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddHoliday = async () => {
        if (!newDate || !newName) return;

        try {
            await createHoliday({
                date: newDate,
                name: newName,
                type: newType
            });
            await loadHolidays();
            setShowAddModal(false);
            setNewDate('');
            setNewName('');
            setNewType('NATIONAL');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        if (!confirm('¿Eliminar este festivo?')) return;

        try {
            await deleteHoliday(id);
            await loadHolidays();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleInitializeBase = async () => {
        try {
            const result = await initializeBaseHolidays(initYear, initCountry);
            alert(`Festivos base creados para ${initYear}: ${result.created}\nOmitidos (ya existían): ${result.skipped.length}`);
            if (year === initYear) await loadHolidays();
            setShowInitModal(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCopyYear = async () => {
        try {
            const result = await copyHolidaysToYear(year, copyToYear);
            alert(`Festivos copiados a ${copyToYear}: ${result.created}\nOmitidos: ${result.skipped.length}`);
            setShowCopyModal(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteYear = async () => {
        try {
            const result = await deleteHolidaysForYear(year);
            alert(`Se eliminaron ${result.deleted} festivos de ${year}`);
            await loadHolidays();
            setShowDeleteConfirm(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const getTypeStyle = (type: string) => {
        return HOLIDAY_TYPES.find(t => t.id === type)?.color || 'bg-neutral-100 text-neutral-700';
    };

    // Group holidays by month
    const holidaysByMonth: Record<number, Holiday[]> = {};
    holidays.forEach(h => {
        const month = new Date(h.date).getMonth();
        if (!holidaysByMonth[month]) holidaysByMonth[month] = [];
        holidaysByMonth[month].push(h);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                        <Calendar className="w-7 h-7 text-red-600" />
                        Calendario Festivo
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Gestión de festivos para cálculo de horas
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowInitModal(true)}
                        className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm flex items-center gap-2 font-medium transition-colors"
                    >
                        <RefreshCw size={16} />
                        Cargar Calendario Base
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-olive-600 text-white rounded-xl hover:bg-olive-700 flex items-center gap-2 font-bold shadow-lg shadow-olive-600/20 transition-all"
                    >
                        <Plus size={18} />
                        Añadir Festivo
                    </button>
                </div>
            </div>

            {/* Year selector and actions */}
            <div className="flex items-center justify-between bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setYear(y => y - 1)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-2xl font-bold min-w-[80px] text-center">{year}</span>
                    <button
                        onClick={() => setYear(y => y + 1)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">{holidays.length} festivos</span>
                    <button
                        onClick={() => setShowCopyModal(true)}
                        className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                        <Copy size={14} />
                        Copiar a otro año
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-1.5 border border-red-300 dark:border-red-800 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                    >
                        <Trash2 size={14} />
                        Eliminar todos
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
                {HOLIDAY_TYPES.map(type => (
                    <div key={type.id} className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded ${type.color}`}>{type.label}</span>
                    </div>
                ))}
            </div>

            {/* Holidays grid by month */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-olive-600 border-t-transparent"></div>
                </div>
            ) : holidays.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500">No hay festivos para {year}</p>
                    <p className="text-sm text-neutral-400 mt-2">Puedes añadir festivos manualmente o cargar los de 2026</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MESES.map((mes, index) => (
                        <div key={index} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                            <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                                <h3 className="font-bold">{mes}</h3>
                            </div>
                            <div className="p-3 space-y-2 min-h-[80px]">
                                {holidaysByMonth[index]?.map(holiday => (
                                    <div key={holiday.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium w-5">
                                                {new Date(holiday.date).getDate()}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${getTypeStyle(holiday.type)}`}>
                                                {holiday.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteHoliday(holiday.id)}
                                            className="p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )) || (
                                        <p className="text-xs text-neutral-400">Sin festivos</p>
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Añadir Festivo</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ej: Día de Andalucía"
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo</label>
                                <select
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                                >
                                    {HOLIDAY_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddHoliday}
                                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-bold"
                            >
                                Añadir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Copy Modal */}
            {showCopyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Copiar Festivos</h3>
                        <p className="text-neutral-500 mb-4">
                            Copiar los {holidays.length} festivos de {year} a otro año
                        </p>
                        <div>
                            <label className="block text-sm font-medium mb-1">Año destino</label>
                            <input
                                type="number"
                                value={copyToYear}
                                onChange={(e) => setCopyToYear(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCopyModal(false)}
                                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCopyYear}
                                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-bold"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <h3 className="text-lg font-bold">Eliminar Todos los Festivos</h3>
                        </div>
                        <p className="text-neutral-500 mb-4">
                            ¿Estás seguro de eliminar los {holidays.length} festivos de {year}? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteYear}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Eliminar Todo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Initialize Base Calendar Modal */}
            {showInitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-olive-600" />
                            Cargar Calendario Base
                        </h3>
                        <p className="text-neutral-500 mb-6 text-sm">
                            Selecciona un año y un país para crear automáticamente los festivos nacionales estándar correspondientes.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Año</label>
                                <input
                                    type="number"
                                    value={initYear}
                                    onChange={(e) => setInitYear(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">País Base</label>
                                <select
                                    value={initCountry}
                                    onChange={(e) => setInitCountry(e.target.value as 'ES' | 'CA')}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
                                >
                                    <option value="ES">🇪🇸 España</option>
                                    <option value="CA">🇨🇦 Canadá</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowInitModal(false)}
                                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleInitializeBase}
                                className="px-4 py-2 bg-olive-600 text-white rounded-xl hover:bg-olive-700 font-bold shadow-lg shadow-olive-600/20 transition-all"
                            >
                                Cargar Festivos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
