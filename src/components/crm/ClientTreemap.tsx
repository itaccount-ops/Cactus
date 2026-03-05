'use client';

import {
    ResponsiveContainer,
    Treemap,
    Tooltip
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface TreemapData {
    name: string;
    size: number;
    count: number;
}

interface ClientTreemapProps {
    data: TreemapData[];
}

// Custom block renderer for Treemap
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name, value, count } = props;

    // Don't render text if the box is too small
    if (width < 50 || height < 30) {
        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : '#ffffff00',
                        stroke: '#fff',
                        strokeWidth: 2 / (depth + 1e-10),
                        strokeOpacity: 1 / (depth + 1e-10),
                    }}
                />
            </g>
        );
    }

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : '#ffffff00',
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {depth === 1 ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={14}
                    fontWeight="bold"
                >
                    {name}
                </text>
            ) : null}
            {depth === 1 ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 - 12}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    opacity={0.8}
                >
                    {formatCurrency(value)} ({count} leads)
                </text>
            ) : null}
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
                <p className="font-bold text-neutral-900 dark:text-white mb-1">{data.name}</p>
                <div className="flex justify-between gap-4 text-sm mb-1">
                    <span className="text-neutral-500">Volumen:</span>
                    <span className="font-semibold text-olive-600 dark:text-olive-400">
                        {formatCurrency(data.value)}
                    </span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                    <span className="text-neutral-500">Leads:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        {data.count}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export default function ClientTreemap({ data }: ClientTreemapProps) {
    const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

    // Formatting for Recharts Treemap root
    const formattedData = useMemo(() => {
        return [{
            name: 'Clientes',
            children: data.sort((a, b) => b.size - a.size).map(item => ({
                name: item.name,
                value: item.size,
                count: item.count
            }))
        }];
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-sm text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                No hay datos suficientes para visualizar
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    width={400}
                    height={200}
                    data={formattedData}
                    dataKey="value"
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomizedContent colors={COLORS} />}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
}
