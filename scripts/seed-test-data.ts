
import { PrismaClient, Role, Department, TaskStatus, TaskPriority, AbsenceType, AbsenceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- DATA FROM EXISTING SEEDS ---

const projectData = [
    // G - General/Gestión
    { code: 'G-21-901', name: 'Mejoras y Organización' },
    { code: 'G-22-902', name: 'Cursos de formación' },
    { code: 'G-22-903', name: 'Ausencias por Vacaciones/Asuntos Propios/ Bajas' },
    { code: 'G-24-904', name: 'Mejoras y Organización INSTALACIONES' },
    { code: 'G-24-905', name: 'Cursos de formación INSTALACIONES' },

    // O - Ofertas/Licitaciones
    { code: 'O-21-801', name: 'Licitaciones' },
    { code: 'O-21-802', name: 'Ofertas Genéricas' },
    { code: 'O-21-803', name: 'Ofertas Monyma' },
    { code: 'O-21-804', name: 'Ofertas Omexom-Iberdrola' },
    { code: 'O-23-805', name: 'Ofertas Instalaciones 2023' },
    { code: 'O-24-806', name: 'Ofertas Instalaciones 2024' },
    { code: 'O-24-807', name: 'Licitaciones Instalaciones' },

    // P-21 - Proyectos 2021
    { code: 'P-21-021', name: 'I&C Agadir' },
    { code: 'P-21-029', name: 'O&M Pachamama I' },
    { code: 'P-21-030', name: 'EE Regadio Agadir' },
    // Scaffolding more projects for realism if needed, but these are checks
    { code: 'P-25-399', name: 'BESS y Linea de Evac' },
    { code: 'P-25-391', name: 'LICENCIA BAR-AMBIGU' },
    { code: 'P-25-394', name: 'DRENAJES PARKINGS AEROPUERTOS' },
    { code: 'P-25-381', name: 'HV Cable Modelling Steady-State Thermal Study' },
    { code: 'P-26-401', name: 'Proyecto Lantania' },
    { code: 'P-25-298', name: 'JEREZOL TOPOGRAFÍA' },
    { code: 'P-25-374', name: 'GESNAER' },
    { code: 'P-25-306', name: 'Actualización trafos Digsilent' },
    { code: 'P-25-358', name: 'Plano planta y perfil' },
    { code: 'P-25-398', name: 'Modificación de planta BESS' },
    { code: 'P-26-403', name: 'BESS MONTES' },
    { code: 'P-26-405', name: 'LAYOUT MARYSOL' },
    { code: 'P-26-406', name: 'LAYOUT MANANTIALES' },
];

const alfonsoEntries = [
    { date: '2026-01-01', notes: 'FESTIVO', projectCode: 'G-21-901', hours: 8 },
    { date: '2026-01-02', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-02', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-05', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 7 },
    { date: '2026-01-05', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-06', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 5 },
    { date: '2026-01-06', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 3 },
    { date: '2026-01-07', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-07', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 4.5 },
    { date: '2026-01-07', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-08', notes: 'Excel Vacaciones ELE', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-08', notes: 'Reunión de producción semanal', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-08', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 4 },
    { date: '2026-01-08', notes: 'Organización proyectos antiguos', projectCode: 'G-21-901', hours: 3.5 },
    { date: '2026-01-09', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-09', notes: 'Organización proyectos antiguos', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-09', notes: 'Server ELE', projectCode: 'G-21-901', hours: 1.5 },
];

const joseManuelBucaratEntries = [
    { date: '2026-01-02', notes: 'VACACIONES', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-399', hours: 1 },
    { date: '2026-01-05', notes: '', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-07', notes: '', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-398', hours: 1 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-399', hours: 1 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-08', notes: '', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-398', hours: 1 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-399', hours: 1 },
    { date: '2026-01-08', notes: '', projectCode: 'O-21-802', hours: 2 },
];

const targetedUsers = [
    { name: 'Enrique Gallego', email: 'enrique.gallego@mep-projects.com', department: 'IT', role: 'SUPERADMIN' },
    { name: 'Fran Gallego', email: 'fran.gallego@mep-projects.com', department: 'IT', role: 'SUPERADMIN' },
    { name: 'F. Valiente', email: 'fvaliente@mep-projects.com', department: 'MARKETING', role: 'WORKER' },
    { name: 'Huberto', email: 'huberto@mep-projects.com', department: 'ECONOMIC', role: 'WORKER' },
    { name: 'José Manuel Bucarat', email: 'jm.bucarat@mep-projects.com', department: 'ELECTRICAL', role: 'SUPERADMIN' },
    { name: 'Alfonso Mateos', email: 'alfonso.mateos@mep-projects.com', department: 'ELECTRICAL', role: 'WORKER' },
];

async function main() {
    console.log('🚀 Starting Test Data Seeding...');

    // 1. Ensure Company Exists
    let company = await prisma.company.findFirst({ where: { slug: 'mep-projects' } });
    if (!company) {
        console.log('🏢 Creating Company...');
        company = await prisma.company.create({
            data: {
                name: 'MEP Projects S.L.',
                slug: 'mep-projects',
                email: 'info@mep-projects.com',
                isActive: true
            }
        });
    }

    // 2. Seed Projects
    console.log('🏗️ Seeding Projects...');
    for (const p of projectData) {
        // Extract year from code if possible (e.g. P-25-399 -> 2025), default to 2026
        let year = 2026;
        const yearMatch = p.code.match(/-(\d{2})-/);
        if (yearMatch) {
            year = 2000 + parseInt(yearMatch[1]);
        }

        await prisma.project.upsert({
            where: { code: p.code },
            update: {},
            create: {
                code: p.code,
                name: p.name,
                companyId: company.id,
                year: year,
                isActive: true
            }
        });
    }
    const projects = await prisma.project.findMany({ where: { companyId: company.id } });
    const projectMap = new Map(projects.map(p => [p.code, p.id]));
    const randomProject = () => projects[Math.floor(Math.random() * projects.length)];

    // 3. Seed Users
    console.log('👥 Seeding Users...');
    const passwordHash = await bcrypt.hash('Mep2026!', 10);
    const userMap = new Map();

    for (const u of targetedUsers) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: u.role as Role,
                department: u.department as Department,
            },
            create: {
                name: u.name,
                email: u.email,
                role: u.role as Role,
                department: u.department as Department,
                passwordHash,
                companyId: company.id,
                isActive: true,
                dailyWorkHours: 8
            }
        });
        userMap.set(u.email, user);
    }

    // 4. Time Entries
    console.log('⏱️ Seeding Time Entries...');

    // Alfonso
    const alfonsoUser = userMap.get('alfonso.mateos@mep-projects.com');
    if (alfonsoUser) {
        await seedEntries(alfonsoUser.id, alfonsoEntries, projectMap);
    }

    // JM Bucarat
    const jmUser = userMap.get('jm.bucarat@mep-projects.com');
    if (jmUser) {
        await seedEntries(jmUser.id, joseManuelBucaratEntries, projectMap);
    }

    // Mock for others
    const others = ['enrique.gallego@mep-projects.com', 'fran.gallego@mep-projects.com', 'fvaliente@mep-projects.com', 'huberto@mep-projects.com'];
    for (const email of others) {
        const u = userMap.get(email);
        if (u) {
            await createMockEntries(u.id, projects);
        }
    }

    // 5. Absences
    console.log('🏖️ Seeding Absences...');
    for (const u of userMap.values()) {
        const existingAbsence = await prisma.absence.findFirst({ where: { userId: u.id } });
        if (!existingAbsence) {
            await prisma.absence.create({
                data: {
                    userId: u.id,
                    startDate: new Date('2026-03-15'),
                    endDate: new Date('2026-03-20'),
                    type: 'VACATION',
                    status: 'APPROVED',
                    reason: 'Semana Santa adelantada',
                    totalDays: 5
                }
            });
        }
    }

    // 6. Tasks
    console.log('✅ Seeding Tasks...');
    for (const u of userMap.values()) {
        const count = await prisma.task.count({ where: { assignedToId: u.id } });
        if (count < 2) {
            const p = randomProject();
            await prisma.task.create({
                data: {
                    title: `Revisión de documentación ${p.code}`,
                    description: `Revisar entrega final del proyecto ${p.name}`,
                    status: 'IN_PROGRESS',
                    priority: 'HIGH',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
                    projectId: p.id,
                    assignedToId: u.id,
                    createdById: userMap.get('enrique.gallego@mep-projects.com')?.id || u.id
                }
            });
            await prisma.task.create({
                data: {
                    title: `Reunión de seguimiento`,
                    description: `Preparar presentación para cliente de ${p.name}`,
                    status: 'PENDING',
                    priority: 'MEDIUM',
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 days
                    projectId: p.id,
                    assignedToId: u.id,
                    createdById: userMap.get('enrique.gallego@mep-projects.com')?.id || u.id
                }
            });
        }
    }

    // 7. Group Chat
    console.log('💬 Seeding Group Chat...');
    try {
        const userIds = Array.from(userMap.values()).map(u => u.id);
        const chatName = "Comité de Dirección";
        const existingChat = await prisma.chat.findFirst({
            where: {
                name: chatName,
                type: 'GROUP'
            }
        });

        if (!existingChat) {
            const chat = await prisma.chat.create({
                data: {
                    name: chatName,
                    type: 'GROUP',
                    members: {
                        create: userIds.map(id => ({ userId: id }))
                    }
                }
            });

            // Add welcome message
            const enriqueId = userMap.get('enrique.gallego@mep-projects.com')?.id;
            if (enriqueId) {
                await prisma.message.create({
                    data: {
                        content: 'Bienvenidos al chat de dirección. Aquí coordinaremos las pruebas de la plataforma.',
                        authorId: enriqueId,
                        chatId: chat.id
                    }
                });
            }
            console.log('✅ Chat created');
        } else {
            console.log('ℹ️ Chat already exists');
        }
    } catch (error: any) {
        console.error('⚠️ Failed to create Group Chat:', error.message);
    }

    console.log('🏁 Seeding Completed!');
}

async function seedEntries(userId: string, entries: any[], projectMap: Map<string, string>) {
    let createdCount = 0;
    for (const entry of entries) {
        const projectId = projectMap.get(entry.projectCode);
        if (!projectId) continue;

        // Check if exists
        const exists = await prisma.timeEntry.findFirst({
            where: {
                userId,
                date: new Date(entry.date),
                projectId
            }
        });

        if (!exists) {
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId,
                    projectId
                }
            });
            createdCount++;
        }
    }
    console.log(`   + Created ${createdCount} entries for user ${userId}`);
}

async function createMockEntries(userId: string, projects: any[]) {
    // Generate entries for Jan 20-30, 2026
    let createdCount = 0;
    const project = projects[0]; // Just pick one

    for (let d = 20; d <= 30; d++) {
        const date = new Date(`2026-01-${d}`);
        const day = date.getDay();
        if (day === 0 || day === 6) continue; // Skip weekends

        const exists = await prisma.timeEntry.findFirst({
            where: { userId, date }
        });

        if (!exists) {
            await prisma.timeEntry.create({
                data: {
                    date,
                    hours: 8,
                    notes: 'Trabajo general de gestión y pruebas',
                    status: 'APPROVED',
                    userId,
                    projectId: project.id
                }
            });
            createdCount++;
        }
    }
    console.log(`   + Created ${createdCount} mock entries for user ${userId}`);
}

main()
    .catch((e) => {
        console.error('❌ SEEDING ERROR:');
        console.error(e.message);
        console.error(JSON.stringify(e, null, 2));
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
