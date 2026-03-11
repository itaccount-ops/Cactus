'use client';

import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface FunnelChartProps {
    data: { name: string; count: number; value: number }[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
    const safeData = data || [];

    const maxCount = useMemo(() => {
        return Math.max(...safeData.map(d => d.count), 1);
    }, [safeData]);

    if (safeData.length === 0) {
        return <div className="h-64 flex items-center justify-center text-sm text-neutral-500">Sin datos de embudo</div>;
    }

    // Color palette from blue -> purple -> pink -> orange -> green
    const colors = [
        '#3b82f6', // blue-500
        '#6366f1', // indigo-500
        '#8b5cf6', // violet-500
        '#a855f7', // purple-500
        '#d946ef', // fuchsia-500
        '#ec4899', // pink-500
        '#f43f5e', // rose-500
        '#f97316', // orange-500
        '#eab308', // yellow-500
        '#84cc16', // lime-500
        '#22c55e', // green-500
    ];

    return (
        <div className="h-72 w-full flex flex-col justify-center space-y-3 px-4">
            {data.map((stage, idx) => {
                // Calculate width based on count so it looks like a funnel (wider top)
                // We use maxCount to define 100% width
                const widthPercent = Math.max((stage.count / maxCount) * 100, 15); // min 15% to be visible

                return (
                    <div key={stage.name} className="flex flex-col items-center group relative">
                        {/* The label above the bar */}
                        <div className="flex justify-between w-full max-w-sm px-1 mb-1">
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 capitalize">{stage.name} ({stage.count})</span>
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(stage.value)}</span>
                        </div>

                        {/* The funnel bar */}
                        <div
                            className="h-8 rounded-full transition-all duration-300 relative overflow-hidden"
                            style={{
                                width: `${widthPercent}%`,
                                maxWidth: '24rem',
                                backgroundColor: colors[idx % colors.length]
                            }}
                        >
                            <div className="absolute inset-0 bg-white/20 dark:bg-black/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
