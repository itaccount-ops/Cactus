require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find first company to use as companyId
    const company = await prisma.company.findFirst();
    if (!company) {
      console.error("No company found in database. Create one first.");
      process.exit(1);
    }

    const count = await prisma.project.count({
      where: { companyId: company.id },
    });
    const code = `TEST-V-${(count + 1).toString().padStart(4, "0")}`;

    console.log(`Attempting to create project with code: ${code}, department: CIVIL_DESIGN`);
    
    const project = await prisma.project.create({
      data: {
        code,
        name: "Verification Project",
        year: 2026,
        department: "CIVIL_DESIGN", // This matches the enum
        isActive: true,
        companyId: company.id,
      }
    });

    console.log("SUCCESS: Project created!");
    console.log(JSON.stringify(project, null, 2));

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } });
    console.log("Cleanup: Project deleted.");

  } catch (error) {
    console.error("FAILURE:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
