import { formatCurrency } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    trendLabel?: string;
    isCurrency?: boolean;
}

export default function KpiCard({ title, value, icon: Icon, trend, trendLabel, isCurrency }: KpiCardProps) {
    const formattedValue = isCurrency && typeof value === 'number'
        ? formatCurrency(value)
        : typeof value === 'number' ? value.toLocaleString('es-ES') : value;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{formattedValue}</h3>
                </div>
                <div className="p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <Icon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                </div>
            </div>

            {(trend !== undefined && trend !== null) && (
                <div className="mt-4 flex items-center gap-1.5">
                    <span className={`flex items-center text-xs font-semibold ${trend > 0 ? 'text-green-600 dark:text-green-400'
                            : trend < 0 ? 'text-red-600 dark:text-red-400'
                                : 'text-neutral-500'
                        }`}>
                        {trend > 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" />
                            : trend < 0 ? <TrendingDown className="w-3.5 h-3.5 mr-1" />
                                : <Minus className="w-3.5 h-3.5 mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                    {trendLabel && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{trendLabel}</span>
                    )}
                </div>
            )}
        </div>
    );
}
