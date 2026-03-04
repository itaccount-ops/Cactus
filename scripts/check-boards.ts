import { PrismaClient } from '@prisma/client';

async function checkBoards(name: string, url: string) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
        const boards = await prisma.board.count();
        console.log(`[${name}] Boards: ${boards}`);
    } catch (e: any) {
        console.log(`[${name}] Error: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    await checkBoards("DIVINE SNOW (Prod)", "postgresql://neondb_owner:npg_yWnqP41fEvAr@ep-divine-snow-airqwrce-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require");
    await checkBoards("SUPER MOUNTAIN (Local)", "postgresql://neondb_owner:npg_yWnqP41fEvAr@ep-super-mountain-aixr8u93-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require");
}

main();
