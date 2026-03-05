import {
    getCrmDashboardKpis,
    getCrmRevenueByMonth,
    getCrmPipelineFunnel,
    getCrmLeadTrend,
    getCrmLeadsByAssignee,
    CrmDashboardFilters
} from '@/lib/crm/actions';
import { prisma } from '@/lib/prisma';
import KpiCard from '@/components/crm/KpiCard';
import RevenueChart from '@/components/crm/RevenueChart';
import ConversionChart from '@/components/crm/ConversionChart';
import FunnelChart from '@/components/crm/FunnelChart';
import DashboardSlicers from '@/components/crm/DashboardSlicers';
import { Target, DollarSign, Activity, FileCheck, Users, Briefcase } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { auth } from '@/auth';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CrmDashboardPage({ searchParams }: PageProps) {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId as string | undefined;

    const resolvedSearchParams = await searchParams;

    const filters: CrmDashboardFilters = {
        year: typeof resolvedSearchParams.year === 'string' ? resolvedSearchParams.year : undefined,
        month: typeof resolvedSearchParams.month === 'string' ? resolvedSearchParams.month : undefined,
        assignee: typeof resolvedSearchParams.assignee === 'string' ? resolvedSearchParams.assignee : undefined,
        source: typeof resolvedSearchParams.source === 'string' ? resolvedSearchParams.source : undefined,
    };

    // Parallel data fetching for performance + Slicer options
    const [kpis, revenueData, funnelData, trendData, assigneesData, dbUsers, dbSources] = await Promise.all([
        getCrmDashboardKpis(filters),
        getCrmRevenueByMonth(12, filters),
        getCrmPipelineFunnel(filters),
        getCrmLeadTrend(90, filters),
        getCrmLeadsByAssignee(filters),
        prisma.user.findMany({ where: { companyId }, select: { id: true, name: true } }),
        prisma.lead.findMany({ where: { companyId }, select: { source: true }, distinct: ['source'] })
    ]);

    const assigneesOptions = dbUsers.map(u => ({ value: u.id, label: u.name }));
    const sourcesOptions = dbSources.filter(s => s.source).map(s => ({ value: s.source!, label: s.source! }));
    const currentYear = new Date().getFullYear();
    const yearsOptions = Array.from({ length: 5 }).map((_, i) => ({
        value: (currentYear - i).toString(),
        label: (currentYear - i).toString()
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Dashboard Comercial</h1>
            </div>

            {/* Global PowerBI Style Slicers */}
            <DashboardSlicers
                assignees={assigneesOptions}
                sources={sourcesOptions}
                years={yearsOptions}
            />

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <KpiCard
                    title="Pipeline Activo"
                    value={kpis.pipelineTotal}
                    icon={DollarSign}
                    isCurrency={true}
                    trend={0}
                    trendLabel="vs mes anterior"
                />
                <KpiCard
                    title="Ingresos del Mes"
                    value={kpis.monthRevenue}
                    icon={Briefcase}
                    isCurrency={true}
                />
                <KpiCard
                    title="Tasa de Conversión"
                    value={`${kpis.conversionRate.toFixed(1)}%`}
                    icon={Activity}
                />
                <KpiCard
                    title="Leads Activos"
                    value={kpis.activeLeads}
                    icon={Target}
                />
                <KpiCard
                    title="Cotizaciones Pdts"
                    value={kpis.pendingQuotes}
                    icon={FileCheck}
                />
                <KpiCard
                    title="Clientes Activos"
                    value={kpis.activeClients}
                    icon={Users}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Ingresos Facturados (Últimos 12 meses)</h3>
                    <RevenueChart data={revenueData} />
                </div>

                {/* Funnel Chart */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Embudo de Ventas (Pipeline Activo)</h3>
                    <FunnelChart data={funnelData} />
                </div>

                {/* Conversion Trend */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Evolución de Leads (90 días)</h3>
                    <ConversionChart data={trendData} />
                </div>

                {/* Leads by Assignee Donut / List */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Leads por Creador / Asignado</h3>

                    <div className="space-y-4">
                        {assigneesData.length === 0 ? (
                            <p className="text-sm text-neutral-500 py-8 text-center">Sin leads asignados</p>
                        ) : (
                            assigneesData.slice(0, 6).map((assignee, i) => (
                                <div key={assignee.assigneeId || `unassigned-${i}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-olive-100 dark:bg-olive-900 flex items-center justify-center text-olive-700 dark:text-olive-300 font-bold text-xs">
                                            {assignee.assigneeName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{assignee.assigneeName}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{assignee.count} leads</p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm text-neutral-900 dark:text-white">
                                        {formatCurrency(assignee.value)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
