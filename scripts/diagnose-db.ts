import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- Database Diagnosis ---');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is NOT defined');
    } else {
        console.log('✅ DATABASE_URL is defined');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn('⚠️ BLOB_READ_WRITE_TOKEN is NOT defined (File uploads will fail)');
    } else {
        console.log('✅ BLOB_READ_WRITE_TOKEN is defined');
    }

    try {
        console.log('Attempting to connect to Prisma...');
        await prisma.$connect();
        console.log('✅ Connection established.');

        console.log('Attempting to query users...');
        const userCount = await prisma.user.count();
        console.log(`✅ Query successful. Users count: ${userCount}`);

        // Check if we can write/read a test log
        /*
        const testLog = await prisma.activityLog.create({
            data: {
                userId: 'diagnosis',
                action: 'TEST_CONNECTION',
                details: 'Diagnosis script'
            }
        });
        console.log('✅ Write successful.');
        */

    } catch (error) {
        console.error('❌ Database connection/query failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(e => console.error(e));
