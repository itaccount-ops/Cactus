import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * AI API Authentication Middleware
 * 
 * Authenticates OpenClaw requests using:
 * 1. API Key in Authorization header (Bearer <key>)
 * 2. User email in X-User-Email header
 * 
 * Returns the authenticated user with role-based permissions
 */

export interface AIAuthResult {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        department: string;
        companyId: string;
        dailyWorkHours: number;
    };
    permissions: {
        canViewAllUsers: boolean;
        canViewDepartment: boolean;
        canCreateTasks: boolean;
        canGenerateReports: boolean;
        canManageProjects: boolean;
    };
}

export async function authenticateAIRequest(
    request: NextRequest
): Promise<{ auth: AIAuthResult | null; error: NextResponse | null }> {
    // Check API Key
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.AI_API_KEY;

    if (!expectedKey) {
        console.error('[AI-API] AI_API_KEY not configured');
        return {
            auth: null,
            error: NextResponse.json(
                { error: 'AI API not configured. Set AI_API_KEY environment variable.' },
                { status: 500 }
            ),
        };
    }

    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
        return {
            auth: null,
            error: NextResponse.json(
                { error: 'Unauthorized. Invalid API key.' },
                { status: 401 }
            ),
        };
    }

    // Get user email
    const userEmail = request.headers.get('x-user-email');
    if (!userEmail) {
        return {
            auth: null,
            error: NextResponse.json(
                { error: 'Missing X-User-Email header.' },
                { status: 400 }
            ),
        };
    }

    // Find user
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            department: true,
            companyId: true,
            dailyWorkHours: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        return {
            auth: null,
            error: NextResponse.json(
                { error: `User not found or inactive: ${userEmail}` },
                { status: 404 }
            ),
        };
    }

    // Determine permissions based on role
    const isSuperAdmin = user.role === 'SUPERADMIN';
    const isAdmin = user.role === 'ADMIN' || isSuperAdmin;

    const permissions = {
        canViewAllUsers: isSuperAdmin,
        canViewDepartment: isAdmin,
        canCreateTasks: isAdmin,
        canGenerateReports: isAdmin,
        canManageProjects: isSuperAdmin,
    };

    return {
        auth: {
            user: {
                id: user.id,
                email: user.email!,
                name: user.name!,
                role: user.role,
                department: user.department || 'UNASSIGNED',
                companyId: user.companyId!,
                dailyWorkHours: user.dailyWorkHours || 8,
            },
            permissions,
        },
        error: null,
    };
}
