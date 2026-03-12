import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      console.error("No company found.");
      process.exit(1);
    }

    const count = await prisma.project.count({
      where: { companyId: company.id },
    });
    const code = `V-OK-${(count + 1).toString().padStart(4, "0")}`;

    console.log(`Verifying project creation: ${code}, Dept: CIVIL_DESIGN`);
    
    const project = await prisma.project.create({
      data: {
        code,
        name: "Verified Fix Project",
        year: 2026,
        department: "CIVIL_DESIGN",
        isActive: true,
        companyId: company.id,
      }
    });

    console.log("SUCCESS: Project created successfully with valid enum value.");
    
    await prisma.project.delete({ where: { id: project.id } });
    console.log("Cleanup: Verified project deleted.");

  } catch (error) {
    console.error("VERIFICATION FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
