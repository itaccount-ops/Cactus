import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Diagnostic: Checking Admin User & Permissions');

    const email = 'enrique.gallego@mep-projects.com';
    const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true, permissions: true }
    });

    if (!user) {
        console.error(`❌ CRITICAL: User ${email} NOT FOUND in DB!`);
        // Check if ANY user exists
        const count = await prisma.user.count();
        console.log(`(Total users in DB: ${count})`);
        return;
    }

    console.log('✅ User Found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
        isActive: user.isActive
    });

    // Check Company
    if (!user.companyId) {
        console.error('❌ CRITICAL: User has NO Company ID!');
    }

    // Check Role
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
        console.error(`⚠️ WARNING: User role is ${user.role}, not ADMIN/SUPERADMIN. Access to /admin/* will fail.`);
    }

    console.log('🔍 Checking for Company Duplicates...');
    const companies = await prisma.company.findMany();
    console.log('🏢 All Companies:', companies.map(c => ({ id: c.id, name: c.name })));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
