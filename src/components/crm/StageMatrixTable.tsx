'use client';

import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface MatrixData {
    assigneeName: string;
    stages: Record<string, number>;
    total: number;
}

interface StageMatrixTableProps {
    data: MatrixData[];
    allStages: string[];
}

export default function StageMatrixTable({ data, allStages }: StageMatrixTableProps) {
    // Sort stages by custom logic or default if needed. Assuming alphabetical or pre-sorted here.
    const sortedStages = useMemo(() => allStages, [allStages]);

    // Sort data by total value descending
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => b.total - a.total);
    }, [data]);

    // Calculate column totals
    const columnTotals: Record<string, number> = useMemo(() => {
        const totals: Record<string, number> = {};
        sortedStages.forEach(stage => totals[stage] = 0);
        let grandTotal = 0;

        data.forEach(row => {
            sortedStages.forEach(stage => {
                const val = row.stages[stage] || 0;
                totals[stage] += val;
            });
            grandTotal += row.total;
        });

        return { ...totals, grandTotal };
    }, [data, sortedStages]);

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-sm text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                No hay datos para la matriz
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto h-[300px] relative">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-3 py-3 font-semibold bg-neutral-50 dark:bg-neutral-800 sticky left-0 z-20">Comercial</th>
                        {sortedStages.map(stage => (
                            <th key={stage} className="px-3 py-3 font-semibold text-right">
                                {stage}
                            </th>
                        ))}
                        <th className="px-3 py-3 font-bold text-neutral-900 dark:text-white text-right bg-neutral-50 dark:bg-neutral-800 sticky right-0 z-20">
                            Total
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                    {sortedData.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-neutral-900 dark:text-gray-100 bg-white dark:bg-transparent sticky left-0 z-10 border-r border-neutral-100 dark:border-neutral-700/50">
                                {row.assigneeName || 'Sin asignar'}
                            </td>
                            {sortedStages.map(stage => {
                                const val = row.stages[stage] || 0;
                                // Simple heatmap visual cue: darker olive for higher relative value
                                const pctOfRow = row.total > 0 ? val / row.total : 0;
                                const hasValue = val > 0;

                                return (
                                    <td key={stage} className="px-3 py-2.5 text-right relative group">
                                        {hasValue && (
                                            <div className="absolute inset-x-1 inset-y-1 bg-olive-100 dark:bg-olive-900/30 rounded-md -z-10"
                                                style={{ opacity: 0.1 + (pctOfRow * 0.9) }} />
                                        )}
                                        <span className={hasValue ? "text-neutral-700 dark:text-neutral-300 font-medium font-mono" : "text-neutral-300 dark:text-neutral-600 font-mono"}>
                                            {hasValue ? formatCurrency(val) : '-'}
                                        </span>
                                    </td>
                                );
                            })}
                            <td className="px-3 py-2.5 font-bold text-olive-700 dark:text-olive-400 text-right bg-white dark:bg-transparent sticky right-0 z-10 border-l border-neutral-100 dark:border-neutral-700/50 font-mono">
                                {formatCurrency(row.total)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-neutral-50 dark:bg-neutral-800 sticky bottom-0 z-10 border-t-2 border-neutral-200 dark:border-neutral-700">
                    <tr>
                        <td className="px-3 py-3 font-bold text-neutral-900 dark:text-white sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-20">
                            Totales Globales
                        </td>
                        {sortedStages.map(stage => (
                            <td key={stage} className="px-3 py-3 font-semibold text-neutral-700 dark:text-neutral-300 text-right font-mono">
                                {formatCurrency(columnTotals[stage])}
                            </td>
                        ))}
                        <td className="px-3 py-3 font-black text-neutral-900 dark:text-white text-right sticky right-0 bg-neutral-50 dark:bg-neutral-800 z-20 font-mono">
                            {formatCurrency(columnTotals.grandTotal)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
