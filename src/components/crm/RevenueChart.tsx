'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface RevenueChartProps {
    data: { month: string; revenue: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-sm text-neutral-500">Sin datos de ingresos</div>;
    }

    // Format month labels from YYYY-MM to localized short month
    const formattedData = data.map(d => {
        const [year, month] = d.month.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
            ...d,
            label: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
        };
    });

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
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
                        tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Ingresos']}
                        labelStyle={{ color: '#171717', fontWeight: 'bold', marginBottom: 4 }}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Bar
                        dataKey="revenue"
                        fill="#84cc16" // lime-500 / olive theme
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
