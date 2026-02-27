import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HolidayInfo {
    date: string;
    name: string;
    type?: string;
}

interface YearlyCalendarProps {
    year: number;
    absences: any[];
    holidays?: HolidayInfo[];
    onMonthClick: (month: number) => void;
    onDayClick: (date: Date) => void;
    onYearChange: (year: number) => void;
}

export default function YearlyCalendar({
    year,
    absences,
    holidays = [],
    onMonthClick,
    onDayClick,
    onYearChange
}: YearlyCalendarProps) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <button
                    onClick={() => onYearChange(year - 1)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                    {year}
                </h2>
                <button
                    onClick={() => onYearChange(year + 1)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {months.map((monthName, index) => (
                    <MonthGrid
                        key={monthName}
                        year={year}
                        month={index + 1}
                        name={monthName}
                        absences={absences}
                        holidays={holidays}
                        onMonthClick={() => onMonthClick(index + 1)}
                        onDayClick={onDayClick}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 px-6 pb-4 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span>🎉 Festivo</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span>Vacaciones</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-purple-500"></div>
                    <span>Asunto Personal</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border-2 border-yellow-400"></div>
                    <span>Pendiente</span>
                </div>
            </div>
        </div>
    );
}

export function MonthGrid({
    year,
    month,
    name,
    absences,
    holidays = [],
    onMonthClick,
    onDayClick,
    variant = 'default'
}: {
    year: number;
    month: number;
    name: string;
    absences: any[];
    holidays?: HolidayInfo[];
    onMonthClick?: () => void;
    onDayClick: (date: Date) => void;
    variant?: 'default' | 'large';
}) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0

    const getAbsencesForDay = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return absences.filter(a => {
            const start = new Date(a.startDate).toISOString().split('T')[0];
            const end = new Date(a.endDate).toISOString().split('T')[0];
            return dateStr >= start && dateStr <= end && a.status !== 'REJECTED' && a.status !== 'CANCELLED';
        });
    };

    const getHolidayForDay = (day: number): HolidayInfo | undefined => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return holidays.find(h => h.date === dateStr);
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            VACATION: 'bg-blue-500',
            SICK: 'bg-red-500',
            PERSONAL: 'bg-purple-500',
            MATERNITY: 'bg-pink-500',
            PATERNITY: 'bg-cyan-500',
            UNPAID: 'bg-yellow-500',
            OTHER: 'bg-neutral-500'
        };
        return colors[type] || 'bg-neutral-400';
    };

    const isLarge = variant === 'large';

    return (
        <div className={`relative ${isLarge ? 'max-w-3xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between mb-4">
                <h3
                    className={`font-bold text-neutral-900 dark:text-white cursor-pointer hover:text-olive-600 transition-colors ${isLarge ? 'text-2xl' : 'text-base'}`}
                    onClick={onMonthClick}
                >
                    {name}
                </h3>
            </div>

            <div className={`grid grid-cols-7 gap-1 text-center font-medium text-neutral-400 mb-2 ${isLarge ? 'text-sm' : 'text-[10px]'}`}>
                <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>D</span><span>D</span>
            </div>

            <div className={`grid grid-cols-7 ${isLarge ? 'gap-3' : 'gap-1'}`}>
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayAbsences = getAbsencesForDay(day);
                    const absence = dayAbsences[0]; // Primary absence to show color
                    const holiday = getHolidayForDay(day);
                    const isWeekend = (firstDay + i) % 7 >= 5;
                    const isToday = new Date().getDate() === day &&
                        new Date().getMonth() + 1 === month &&
                        new Date().getFullYear() === year;

                    return (
                        <div
                            key={day}
                            onClick={() => onDayClick(new Date(year, month - 1, day))}
                            className={`
                                aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all relative group/day hover:z-20
                                ${isLarge ? 'text-lg h-20' : 'text-xs'}
                                ${holiday
                                    ? 'bg-red-500 text-white hover:brightness-95 shadow-sm'
                                    : absence
                                        ? `${getTypeColor(absence.type)} text-white hover:brightness-95 shadow-sm`
                                        : isToday
                                            ? 'bg-olive-600 text-white font-bold shadow-md'
                                            : isWeekend
                                                ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500'
                                                : 'border border-neutral-100 dark:border-neutral-700 hover:border-olive-300 dark:hover:border-olive-600 hover:shadow-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                                }
                                ${absence && absence.status === 'PENDING' ? 'ring-2 ring-yellow-400 ring-offset-1 dark:ring-offset-neutral-900' : ''}
                            `}
                        >
                            <span className="relative z-10">{day}</span>
                            {isLarge && holiday && !absence && (
                                <div className="absolute bottom-1 left-0 right-0 text-[10px] text-center truncate px-1 opacity-90">
                                    🎉
                                </div>
                            )}
                            {isLarge && absence && (
                                <div className="absolute bottom-1 left-0 right-0 text-[10px] text-center truncate px-1 opacity-90">
                                    {dayAbsences.length > 1 ? `+${dayAbsences.length - 1} más` : absence.type.substring(0, 3)}
                                </div>
                            )}
                            {!isLarge && dayAbsences.length > 1 && (
                                <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                            )}

                            {/* Rich Tooltip (Popup Style on Hover) */}
                            {(dayAbsences.length > 0 || holiday) && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/day:block z-50 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-2 text-left">
                                    <div className="text-xs font-semibold text-neutral-900 dark:text-white mb-2 border-b border-neutral-100 dark:border-neutral-700 pb-1">
                                        {day} de {name}
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {holiday && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[10px] shrink-0">
                                                    🎉
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-medium text-neutral-900 dark:text-white truncate leading-tight">
                                                        {holiday.name}
                                                    </p>
                                                    <p className="text-[9px] text-red-500 leading-tight">
                                                        Festivo
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {dayAbsences.map((a: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-neutral-600 dark:text-neutral-300 overflow-hidden shrink-0">
                                                    {a.user?.image ? (
                                                        <img src={a.user.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        a.user?.name?.substring(0, 2).toUpperCase() || 'AB'
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-medium text-neutral-900 dark:text-white truncate leading-tight">
                                                        {a.user?.name || 'Usuario'}
                                                    </p>
                                                    <p className="text-[9px] text-neutral-500 dark:text-neutral-400 leading-tight">
                                                        {a.type}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-white dark:border-t-neutral-800"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
