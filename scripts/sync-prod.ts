import { PrismaClient } from '@prisma/client';

const prodDbUrl = "postgresql://neondb_owner:npg_yWnqP41fEvAr@ep-divine-snow-airqwrce-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const localDbUrl = "postgresql://neondb_owner:npg_yWnqP41fEvAr@ep-super-mountain-aixr8u93-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const prodPrisma = new PrismaClient({
    datasources: {
        db: {
            url: prodDbUrl,
        },
    },
});

const localPrisma = new PrismaClient({
    datasources: {
        db: {
            url: localDbUrl,
        },
    },
});

async function main() {
    console.log('[+] Iniciando migración de datos de producción a local...');

    // 1. Clear local DB safely
    console.log('[-] Limpiando base de datos local (TRUNCATE CASCADE)...');

    const tablenames = await localPrisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
            try {
                await localPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
            } catch (error) {
                console.error(`[!] Error al truncar ${tablename}`, error);
            }
        }
    }

    // 2. Fetch data from prod
    console.log('[v] Obteniendo datos de producción...');
    const companies = await prodPrisma.company.findMany();
    const users = await prodPrisma.user.findMany();
    const clients = await prodPrisma.client.findMany();
    const projects = await prodPrisma.project.findMany();

    // Only fetch time entries related to our user IDs (and Project IDs)
    const timeEntries = await prodPrisma.timeEntry.findMany({
        where: {
            userId: { in: users.map(u => u.id) },
            projectId: { in: projects.map(p => p.id) }
        }
    });

    // We CANNOT fetch Boards/Groups from Prod because the table doesn't exist yet in Prod! 
    const boards: any[] = [];
    const boardGroups: any[] = [];
    const boardItems: any[] = [];
    const boardSubitems: any[] = [];

    // 3. Insert into local DB in STRICT foreign key order
    console.log('[^] Insertando datos en base de datos local...');

    if (companies.length > 0) {
        await localPrisma.company.createMany({ data: companies, skipDuplicates: true });
        console.log(`  - ${companies.length} empresas copiadas.`);
    }

    if (users.length > 0) {
        await localPrisma.user.createMany({ data: users, skipDuplicates: true });
        console.log(`  - ${users.length} usuarios copiados.`);
    }

    if (clients.length > 0) {
        await localPrisma.client.createMany({ data: clients, skipDuplicates: true });
        console.log(`  - ${clients.length} clientes copiados.`);
    }

    if (projects.length > 0) {
        await localPrisma.project.createMany({ data: projects, skipDuplicates: true });
        console.log(`  - ${projects.length} proyectos copiados.`);
    }

    if (timeEntries.length > 0) {
        await localPrisma.timeEntry.createMany({ data: timeEntries, skipDuplicates: true });
        console.log(`  - ${timeEntries.length} registros de horas copiados.`);
    }

    if (boards.length > 0) {
        await localPrisma.board.createMany({ data: boards, skipDuplicates: true });
        console.log(`  - ${boards.length} tableros copiados.`);
    }

    if (boardGroups.length > 0) {
        // Prisma types for JSON need casting in arrays generally
        await localPrisma.boardGroup.createMany({ data: boardGroups as any, skipDuplicates: true });
        console.log(`  - ${boardGroups.length} grupos de tablero copiados.`);
    }

    if (boardItems.length > 0) {
        await localPrisma.boardItem.createMany({ data: boardItems as any, skipDuplicates: true });
        console.log(`  - ${boardItems.length} items de tablero copiados.`);
    }

    if (boardSubitems.length > 0) {
        await localPrisma.boardSubitem.createMany({ data: boardSubitems as any, skipDuplicates: true });
        console.log(`  - ${boardSubitems.length} sub-items de tablero copiados.`);
    }

    console.log('¡Migración completada con éxito!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prodPrisma.$disconnect();
        await localPrisma.$disconnect();
    });
