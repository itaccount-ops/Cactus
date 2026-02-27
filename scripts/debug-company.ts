import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Company IDs...');

    const companies = await prisma.company.findMany({ select: { id: true, name: true, slug: true } });
    console.log('🏢 Companies:', JSON.stringify(companies, null, 2));

    const admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' }, select: { email: true, companyId: true, id: true } });
    console.log('👤 Admin:', admin);

    const users = await prisma.user.findMany({ take: 3, select: { email: true, companyId: true } });
    console.log('👥 First 3 Users:', users);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
