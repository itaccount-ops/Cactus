import { PrismaClient } from '@prisma/client';
import fs from 'fs';

async function checkDb(name: string, url: string) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        const users = await prisma.user.count();
        const projects = await prisma.project.count();
        const tickets = await prisma.timeEntry.count();
        return { name, users, projects, tickets };
    } catch (e: any) {
        return { name, error: e.message };
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const results = [];
    results.push(await checkDb("DIVINE SNOW", "postgresql://neondb_owner:npg_yWnqP41fEvAr@ep-divine-snow-airqwrce-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"));
    results.push(await checkDb("LATE MOUNTAIN", "postgresql://neondb_owner:npg_ljpe5Gf6ahuK@ep-late-mountain-ag8ms46x-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"));
    results.push(await checkDb("SUPER MOUNTAIN", "postgresql://neondb_owner:npg_yWnqP41fEvAr@ep-super-mountain-aixr8u93-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"));

    fs.writeFileSync('scripts/counts.json', JSON.stringify(results, null, 2), 'utf-8');
}

main();
