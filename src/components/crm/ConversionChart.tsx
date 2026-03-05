'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface ConversionChartProps {
    data: { week: string; created: number; won: number; lost: number }[];
}

export default function ConversionChart({ data }: ConversionChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-sm text-neutral-500">Sin datos de leads</div>;
    }

    // Format week labels
    const formattedData = data.map(d => {
        const date = new Date(d.week);
        return {
            ...d,
            label: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
        };
    });

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#737373' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#737373' }}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        labelStyle={{ color: '#171717', fontWeight: 'bold', marginBottom: 4 }}
                    />
                    <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                    <Line
                        type="monotone"
                        name="Creados"
                        dataKey="created"
                        stroke="#3b82f6" // blue-500
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                    />
                    <Line
                        type="monotone"
                        name="Ganados"
                        dataKey="won"
                        stroke="#22c55e" // green-500
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2 }}
                    />
                    <Line
                        type="monotone"
                        name="Perdidos"
                        dataKey="lost"
                        stroke="#ef4444" // red-500
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
