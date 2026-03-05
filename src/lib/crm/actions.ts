'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { CrmActivityType, LeadStage } from '@prisma/client';

async function getAuthenticatedUser() {
    const session = await auth();
    if (!session?.user?.email) throw new Error('No autenticado');
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, role: true, department: true, companyId: true }
    });
    if (!user) throw new Error('Usuario no encontrado');
    if (!user.companyId) throw new Error('Usuario sin compañía asignada');
    return user;
}

// ============================================
// DASHBOARD KPIs & CHARTS
// ============================================

export interface CrmDashboardFilters {
    year?: string;
    month?: string;
    assignee?: string;
    source?: string;
}

function buildLeadFilter(companyId: string, filters?: CrmDashboardFilters) {
    const where: any = { companyId };

    if (filters?.assignee) {
        where.assignedToId = filters.assignee;
    }

    if (filters?.source) {
        where.source = filters.source;
    }

    if (filters?.year) {
        const year = parseInt(filters.year);
        const month = filters?.month ? parseInt(filters.month) - 1 : undefined;

        const startDate = month !== undefined
            ? new Date(year, month, 1)
            : new Date(year, 0, 1);

        const endDate = month !== undefined
            ? new Date(year, month + 1, 0, 23, 59, 59)
            : new Date(year, 11, 31, 23, 59, 59);

        where.createdAt = {
            gte: startDate,
            lte: endDate
        };
    }

    return where;
}

export async function getCrmDashboardKpis(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    const [totalPipelineResult, activeLeads, conversionResult, monthRevenueResult, pendingQuotes, activeClients] = await Promise.all([
        // Pipeline total (not lost)
        prisma.lead.aggregate({
            where: { ...leadFilter, stage: { not: 'CLOSED_LOST' } },
            _sum: { value: true }
        }),
        // Active leads (not won/lost)
        prisma.lead.count({
            where: { ...leadFilter, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } }
        }),
        // Conversions
        prisma.$transaction([
            prisma.lead.count({ where: { ...leadFilter, stage: 'CLOSED_WON' } }),
            prisma.lead.count({ where: { ...leadFilter, stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] } } })
        ]),
        // Revenue (Uses year/month if provided, else current month)
        prisma.invoice.aggregate({
            where: {
                companyId,
                status: 'PAID',
                ...(filters?.year ? {
                    paidAt: {
                        gte: filters.month
                            ? new Date(parseInt(filters.year), parseInt(filters.month) - 1, 1)
                            : new Date(parseInt(filters.year), 0, 1),
                        lte: filters.month
                            ? new Date(parseInt(filters.year), parseInt(filters.month), 0, 23, 59, 59)
                            : new Date(parseInt(filters.year), 11, 31, 23, 59, 59)
                    }
                } : {
                    paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                })
            },
            _sum: { total: true }
        }),
        // Pending quotes
        prisma.quote.count({
            where: {
                companyId,
                status: 'SENT',
                ...(filters?.year ? {
                    createdAt: {
                        gte: new Date(parseInt(filters.year), filters.month ? parseInt(filters.month) - 1 : 0, 1),
                        lte: new Date(parseInt(filters.year), filters.month ? parseInt(filters.month) : 12, 0, 23, 59, 59)
                    }
                } : {})
            }
        }),
        // Active clients
        prisma.client.count({
            where: { companyId: companyId, isActive: true, status: 'ACTIVE' }
        })
    ]);

    const wonCount = conversionResult[0];
    const closedCount = conversionResult[1];
    const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;

    return {
        pipelineTotal: Number(totalPipelineResult._sum.value || 0),
        activeLeads,
        conversionRate,
        monthRevenue: Number(monthRevenueResult._sum.total || 0),
        pendingQuotes,
        activeClients
    };
}

export async function getCrmRevenueByMonth(months = 12, filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Aggregate by month using basic query then formatting
    const invoices = await prisma.invoice.findMany({
        where: {
            companyId,
            paidAt: { gte: startDate },
            status: 'PAID'
        },
        select: { paidAt: true, total: true }
    });

    // Group by month
    const monthlyData: Record<string, number> = {};
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().substring(0, 7); // YYYY-MM
        monthlyData[key] = 0;
    }

    invoices.forEach(inv => {
        if (inv.paidAt) {
            const key = inv.paidAt.toISOString().substring(0, 7);
            if (monthlyData[key] !== undefined) {
                monthlyData[key] += Number(inv.total);
            }
        }
    });

    return Object.entries(monthlyData).map(([month, revenue]) => ({
        month,
        revenue
    }));
}

export async function getCrmPipelineFunnel(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    // By pipelineStage primarily, fallback to LeadStage enum if not using custom stages
    const leads = await prisma.lead.findMany({
        where: { ...leadFilter, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
        select: { stage: true, pipelineStage: { select: { name: true, order: true } }, value: true }
    });

    const stages: Record<string, { count: number, value: number, order: number }> = {};

    leads.forEach(lead => {
        const stageName = (lead as any).pipelineStage?.name || lead.stage;
        const order = (lead as any).pipelineStage?.order || getStageOrder(lead.stage as LeadStage);

        if (!stages[stageName]) {
            stages[stageName] = { count: 0, value: 0, order };
        }
        stages[stageName].count++;
        stages[stageName].value += Number(lead.value);
    });

    return Object.entries(stages)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => a.order - b.order);
}

function getStageOrder(stage: LeadStage): number {
    const order = { 'NEW': 1, 'QUALIFIED': 2, 'PROPOSAL': 3, 'NEGOTIATION': 4, 'CLOSED_WON': 5, 'CLOSED_LOST': 6 };
    return order[stage as keyof typeof order] || 99;
}

export async function getCrmLeadTrend(days = 90, filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const leads = await prisma.lead.findMany({
        where: { ...leadFilter, createdAt: { gte: startDate } },
        select: { createdAt: true, stage: true }
    });

    // Group by week
    const weeklyData: Record<string, { created: number, won: number, lost: number }> = {};
    leads.forEach(lead => {
        // Find monday of the week
        const d = new Date(lead.createdAt);
        const day = d.getDay() || 7;
        d.setHours(-24 * (day - 1));
        const weekKey = d.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) weeklyData[weekKey] = { created: 0, won: 0, lost: 0 };
        weeklyData[weekKey].created++;
        if (lead.stage === 'CLOSED_WON') weeklyData[weekKey].won++;
        if (lead.stage === 'CLOSED_LOST') weeklyData[weekKey].lost++;
    });

    return Object.entries(weeklyData)
        .map(([week, data]) => ({ week, ...data }))
        .sort((a, b) => a.week.localeCompare(b.week));
}

export async function getCrmLeadsByAssignee(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    const metrics = await prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { ...leadFilter, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
        _count: { id: true },
        _sum: { value: true }
    });

    const userIds = metrics.map(m => m.assignedToId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
    });

    const userMap = new Map(users.map(u => [u.id, u.name]));

    return metrics.map(m => ({
        assigneeId: m.assignedToId,
        assigneeName: m.assignedToId ? userMap.get(m.assignedToId) || 'Desconocido' : 'Sin asignar',
        count: m._count.id,
        value: Number(m._sum.value || 0)
    })).sort((a, b) => b.value - a.value);
}

export async function getCrmClientConcentration(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    // Sum revenue or lead value grouped by client to understand concentration
    const metrics = await prisma.lead.groupBy({
        by: ['clientId'],
        where: { ...leadFilter, clientId: { not: null } },
        _count: { id: true },
        _sum: { value: true }
    });

    const clientIds = metrics.map(m => m.clientId!).filter(Boolean);
    const clients = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true }
    });

    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    return metrics.map(m => ({
        name: clientMap.get(m.clientId!) || 'Cliente Desconocido',
        size: Number(m._sum.value || 0),
        count: m._count.id
    })).sort((a, b) => b.size - a.size);
}

export async function getCrmWinLossBySource(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    const metrics = await prisma.lead.groupBy({
        by: ['source', 'stage'],
        where: { ...leadFilter, stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] } },
        _count: { id: true },
        _sum: { value: true }
    });

    const sourceMap = new Map<string, any>();

    metrics.forEach(m => {
        const source = m.source || 'Desconocido';
        if (!sourceMap.has(source)) {
            sourceMap.set(source, { source, won: 0, lost: 0, wonValue: 0, lostValue: 0 });
        }

        const data = sourceMap.get(source)!;
        const val = Number((m as any)._sum?.value || 0);
        if (m.stage === 'CLOSED_WON') {
            data.won += (m as any)._count?.id || 0;
            data.wonValue += val;
        } else {
            data.lost += (m as any)._count?.id || 0;
            data.lostValue += val;
        }
    });

    return Array.from(sourceMap.values()).sort((a, b) => (b.wonValue + b.lostValue) - (a.wonValue + a.lostValue));
}

export async function getCrmSalesCycle(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    const leads = await prisma.lead.findMany({
        where: { ...leadFilter, stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] } },
        select: { id: true, title: true, value: true, stage: true, createdAt: true, updatedAt: true }
    });

    return leads.map(l => {
        const created = new Date(l.createdAt).getTime();
        const closed = new Date(l.updatedAt).getTime();
        const daysToClose = Math.max(1, Math.round((closed - created) / (1000 * 60 * 60 * 24)));

        return {
            id: l.id,
            title: l.title,
            value: Number(l.value || 0),
            stage: l.stage,
            daysToClose
        };
    });
}

export async function getCrmStageMatrix(filters?: CrmDashboardFilters) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;
    const leadFilter = buildLeadFilter(companyId, filters);

    const leads = await prisma.lead.findMany({
        where: { ...leadFilter, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
        select: { value: true, stage: true, assignedTo: { select: { id: true, name: true } }, pipelineStage: { select: { name: true } } }
    });

    const matrix: Record<string, { assigneeName: string, stages: Record<string, number>, total: number }> = {};
    const allStagesSet = new Set<string>();

    leads.forEach(l => {
        const assigneeId = (l as any).assignedTo?.id || 'unassigned';
        const assigneeName = (l as any).assignedTo?.name || 'Sin asignar';
        const stageName = (l as any).pipelineStage?.name || l.stage;

        allStagesSet.add(stageName);

        if (!matrix[assigneeId]) {
            matrix[assigneeId] = { assigneeName, stages: {}, total: 0 };
        }

        if (!matrix[assigneeId].stages[stageName]) {
            matrix[assigneeId].stages[stageName] = 0;
        }

        const val = Number(l.value || 0);
        matrix[assigneeId].stages[stageName] += val;
        matrix[assigneeId].total += val;
    });

    return {
        data: Object.values(matrix),
        allStages: Array.from(allStagesSet)
    };
}

// ============================================
// PIPELINE (KANBAN)
// ============================================

export async function getCrmPipelineStages() {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;

    // Ensure default stages exist if none
    const count = await prisma.crmPipelineStage.count({ where: { companyId } });
    if (count === 0) {
        await prisma.crmPipelineStage.createMany({
            data: [
                { companyId, name: 'Nuevo', order: 1, color: '#3b82f6' },
                { companyId, name: 'Cualificado', order: 2, color: '#8b5cf6' },
                { companyId, name: 'Propuesta', order: 3, color: '#f59e0b' },
                { companyId, name: 'Negociación', order: 4, color: '#ec4899' }
            ]
        });
    }

    return prisma.crmPipelineStage.findMany({
        where: { companyId },
        orderBy: { order: 'asc' }
    });
}

export async function getCrmPipelineLeads() {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;

    return prisma.lead.findMany({
        where: { companyId, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
        include: {
            client: { select: { name: true, companyName: true } },
            assignedTo: { select: { name: true, image: true } },
            pipelineStage: true,
            _count: { select: { crmActivities: { where: { completed: false } } } }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

export async function moveLead(leadId: string, newStage: string, newPipelineStageId?: string) {
    const user = await getAuthenticatedUser();
    const lead = await prisma.lead.update({
        where: { id: leadId, companyId: user.companyId! },
        data: {
            stage: newStage as LeadStage,
            pipelineStageId: newPipelineStageId || null
        }
    });
    revalidatePath('/crm/pipeline');
    revalidatePath('/crm/dashboard');
    return lead;
}

export async function updateLeadProbability(leadId: string, probability: number) {
    const user = await getAuthenticatedUser();
    const lead = await prisma.lead.update({
        where: { id: leadId, companyId: user.companyId! },
        data: { probability }
    });
    revalidatePath('/crm/pipeline');
    return lead;
}

// ============================================
// CLIENTS
// ============================================

export async function getCrmClients(filters?: { search?: string, status?: string }) {
    const user = await getAuthenticatedUser();

    return prisma.client.findMany({
        where: {
            companyId: user.companyId!,
            isActive: true,
            ...(filters?.status ? { status: filters.status as any } : {}),
            ...(filters?.search ? {
                OR: [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { email: { contains: filters.search, mode: 'insensitive' } }
                ]
            } : {})
        },
        include: {
            _count: { select: { leads: true, projects: true, invoices: true } }
        },
        orderBy: { name: 'asc' }
    });
}

export async function getClientDetail(clientId: string) {
    const user = await getAuthenticatedUser();
    const client = await prisma.client.findUnique({
        where: { id: clientId, companyId: user.companyId! },
        include: {
            contacts: true,
            leads: { orderBy: { createdAt: 'desc' } },
            projects: { orderBy: [{ year: 'desc' }, { name: 'asc' }], take: 5 },
            invoices: { orderBy: { date: 'desc' }, take: 5 },
            crmActivities: {
                where: { companyId: user.companyId! },
                orderBy: { date: 'desc' },
                include: { createdBy: { select: { name: true, image: true } } }
            }
        }
    });

    if (!client) return null;

    // Convert Prisma Decimals to simple numbers for Next.js Client serialization
    return {
        ...client,
        leads: (client as any).leads.map((l: any) => ({ ...l, value: Number(l.value || 0) })),
        projects: (client as any).projects.map((p: any) => ({ ...p, hourlyRate: Number(p.hourlyRate || 0) })),
        invoices: (client as any).invoices.map((i: any) => ({
            ...i,
            subtotal: Number(i.subtotal || 0),
            taxAmount: Number(i.taxAmount || 0),
            total: Number(i.total || 0),
            paidAmount: Number(i.paidAmount || 0),
            balance: Number(i.balance || 0)
        }))
    };
}

export async function createClient(data: any) {
    const user = await getAuthenticatedUser();
    const result = await prisma.client.create({
        data: {
            ...data,
            companyId: user.companyId!
        }
    });
    revalidatePath('/crm/clients');
    return result;
}

export async function updateClient(clientId: string, data: any) {
    const user = await getAuthenticatedUser();
    const result = await prisma.client.update({
        where: { id: clientId, companyId: user.companyId! },
        data
    });
    revalidatePath('/crm/clients');
    revalidatePath(`/crm/clients/${clientId}`);
    return result;
}

// ============================================
// LEADS
// ============================================

export async function getCrmLeads(filters?: { search?: string, stage?: string, assigneeId?: string }) {
    const user = await getAuthenticatedUser();

    return prisma.lead.findMany({
        where: {
            companyId: user.companyId!,
            ...(filters?.stage ? { stage: filters.stage as LeadStage } : {}),
            ...(filters?.assigneeId ? { assignedToId: filters.assigneeId } : {}),
            ...(filters?.search ? {
                OR: [
                    { title: { contains: filters.search, mode: 'insensitive' } },
                    { client: { name: { contains: filters.search, mode: 'insensitive' } } }
                ]
            } : {})
        },
        include: {
            client: { select: { name: true, companyName: true } },
            assignedTo: { select: { name: true, image: true } },
            pipelineStage: true
        },
        orderBy: { updatedAt: 'desc' }
    });
}

export async function getLeadDetail(leadId: string) {
    const user = await getAuthenticatedUser();
    const lead = await prisma.lead.findUnique({
        where: { id: leadId, companyId: user.companyId! },
        include: {
            client: { include: { contacts: true } },
            assignedTo: { select: { id: true, name: true, image: true } },
            pipelineStage: true,
            crmActivities: {
                where: { companyId: user.companyId! },
                orderBy: { date: 'desc' },
                include: { createdBy: { select: { name: true, image: true } } }
            },
            Quote: { orderBy: { createdAt: 'desc' } }
        }
    });

    if (!lead) return null;

    // Convert Prisma Decimals to simple numbers for Next.js Client serialization
    return {
        ...lead,
        value: Number(lead.value || 0),
        Quote: (lead as any).Quote.map((q: any) => ({
            ...q,
            subtotal: Number(q.subtotal || 0),
            taxAmount: Number(q.taxAmount || 0),
            total: Number(q.total || 0)
        }))
    };
}

export async function createLead(data: any) {
    const user = await getAuthenticatedUser();

    // Auto-assign to self if not specified
    const assignedToId = data.assignedToId || user.id;

    const result = await prisma.lead.create({
        data: {
            title: data.title,
            description: data.description,
            value: data.value,
            probability: data.probability || 0,
            stage: data.stage || 'NEW',
            source: data.source,
            clientId: data.clientId,
            assignedToId,
            pipelineStageId: data.pipelineStageId,
            companyId: user.companyId!
        }
    });
    revalidatePath('/crm/leads');
    revalidatePath('/crm/pipeline');
    revalidatePath('/crm/dashboard');
    return result;
}

export async function updateLead(leadId: string, data: any) {
    const user = await getAuthenticatedUser();
    const result = await prisma.lead.update({
        where: { id: leadId, companyId: user.companyId! },
        data
    });
    revalidatePath('/crm/leads');
    revalidatePath('/crm/pipeline');
    revalidatePath(`/crm/leads/${leadId}`);
    return result;
}

export async function deleteLead(leadId: string) {
    const user = await getAuthenticatedUser();
    await prisma.lead.delete({
        where: { id: leadId, companyId: user.companyId! }
    });
    revalidatePath('/crm/leads');
    revalidatePath('/crm/pipeline');
    revalidatePath('/crm/dashboard');
    return { success: true };
}

// ============================================
// QUOTES
// ============================================

export async function getCrmQuotes(filters?: { status?: string, search?: string }) {
    const user = await getAuthenticatedUser();

    return prisma.quote.findMany({
        where: {
            companyId: user.companyId!,
            ...(filters?.status ? { status: filters.status as any } : {}),
            ...(filters?.search ? {
                OR: [
                    { number: { contains: filters.search, mode: 'insensitive' } },
                    { client: { name: { contains: filters.search, mode: 'insensitive' } } }
                ]
            } : {})
        },
        include: {
            client: { select: { name: true } },
            lead: { select: { title: true } },
            createdBy: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

// ============================================
// ACTIVITIES
// ============================================

export async function getCrmActivities(filters?: { leadId?: string, clientId?: string, completed?: boolean, type?: CrmActivityType }) {
    const user = await getAuthenticatedUser();

    return prisma.crmActivity.findMany({
        where: {
            companyId: user.companyId!,
            ...(filters?.leadId ? { leadId: filters.leadId } : {}),
            ...(filters?.clientId ? { clientId: filters.clientId } : {}),
            ...(filters?.completed !== undefined ? { completed: filters.completed } : {}),
            ...(filters?.type ? { type: filters.type } : {})
        },
        include: {
            createdBy: { select: { name: true, image: true } },
            lead: { select: { id: true, title: true } },
            client: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
    });
}

export async function createActivity(data: {
    type: CrmActivityType;
    title: string;
    description?: string;
    dueDate?: Date;
    leadId?: string;
    clientId?: string;
}) {
    const user = await getAuthenticatedUser();

    const result = await prisma.crmActivity.create({
        data: {
            ...data,
            companyId: user.companyId!,
            createdById: user.id
        }
    });

    revalidatePath('/crm/activities');
    if (data.leadId) revalidatePath(`/crm/leads/${data.leadId}`);
    if (data.clientId) revalidatePath(`/crm/clients/${data.clientId}`);

    return result;
}

export async function completeActivity(activityId: string, completed: boolean = true) {
    const user = await getAuthenticatedUser();

    const result = await prisma.crmActivity.update({
        where: { id: activityId, companyId: user.companyId! },
        data: { completed }
    });

    revalidatePath('/crm/activities');
    if (result.leadId) revalidatePath(`/crm/leads/${result.leadId}`);
    if (result.clientId) revalidatePath(`/crm/clients/${result.clientId}`);

    return result;
}

export async function deleteActivity(activityId: string) {
    const user = await getAuthenticatedUser();

    const activity = await prisma.crmActivity.delete({
        where: { id: activityId, companyId: user.companyId! }
    });

    revalidatePath('/crm/activities');
    if (activity.leadId) revalidatePath(`/crm/leads/${activity.leadId}`);
    if (activity.clientId) revalidatePath(`/crm/clients/${activity.clientId}`);

    return { success: true };
}

// force ts reload

// ----- TIMELINE & ADVANCED CRM -----
export async function getLeadTimeline(leadId: string) {
    const user = await getAuthenticatedUser();
    const companyId = user.companyId!;

    const [activities, logs] = await Promise.all([
        prisma.crmActivity.findMany({
            where: { leadId, companyId },
            include: { createdBy: { select: { name: true, image: true } } },
            orderBy: { date: 'desc' }
        }),
        prisma.activityLog.findMany({
            where: { entityType: 'LEAD', entityId: leadId, companyId },
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const formattedActivities = activities.map(a => ({
        id: a.id,
        sourceType: 'ACTIVITY',
        type: a.type,
        title: a.title,
        description: a.description,
        date: a.date,
        completed: a.completed,
        userName: a.createdBy?.name,
        userImage: a.createdBy?.image
    }));

    const formattedLogs = logs.map(l => ({
        id: l.id,
        sourceType: 'LOG',
        type: 'SYSTEM',
        title: l.action,
        description: l.details,
        date: l.createdAt,
        completed: true,
        userName: l.user?.name,
        userImage: l.user?.image
    }));

    return [...formattedActivities, ...formattedLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getClientTimeline(clientId: string) {
    const session = await auth();
    if (!session?.user) throw new Error('No autorizado');
    const companyId = (session.user as any).companyId;
    
    const [activities, logs] = await Promise.all([
        prisma.crmActivity.findMany({
            where: { clientId, companyId },
            include: { 
                createdBy: { select: { name: true, image: true } },
                lead: { select: { title: true } }
            },
            orderBy: { date: 'desc' }
        }),
        prisma.activityLog.findMany({
            where: { entityType: 'CLIENT', entityId: clientId, companyId },
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const formattedActivities = activities.map(a => ({
        id: a.id,
        sourceType: 'ACTIVITY',
        type: a.type,
        title: a.title,
        description: a.description,
        date: a.date,
        completed: a.completed,
        userName: a.createdBy?.name,
        userImage: a.createdBy?.image,
        leadTitle: a.lead?.title
    }));

    const formattedLogs = logs.map(l => ({
        id: l.id,
        sourceType: 'LOG',
        type: 'SYSTEM',
        title: l.action,
        description: l.details,
        date: l.createdAt,
        completed: true,
        userName: l.user?.name,
        userImage: l.user?.image
    }));

    return [...formattedActivities, ...formattedLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
}
