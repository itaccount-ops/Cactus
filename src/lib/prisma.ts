import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prismaClientSingleton = () => {
    // Fallback for Vercel build time if DATABASE_URL is missing
    const url = process.env.DATABASE_URL;

    if (!url) {
        console.warn('⚠️ DATABASE_URL is missing. Using fallback for build phase.');
        return new PrismaClient({
            datasources: {
                db: {
                    url: 'postgresql://build:build@localhost:5432/build_db',
                },
            },
            log: ['query'],
        });
    }

    return new PrismaClient({
        log: ['error', 'warn'],
    })
}

export const prisma = globalForPrisma.prisma || prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
