import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Sembrando datos CRM de ejemplo...\n');

    // Obtener empresa MEP Projects
    const company = await prisma.company.findFirst({ where: { slug: 'mep-projects' } });
    if (!company) throw new Error('❌ Empresa MEP Projects no encontrada. Ejecuta seed-users.ts primero.');

    // Obtener usuarios reales para asignar leads
    const users = await prisma.user.findMany({
        where: { companyId: company.id, isActive: true },
        select: { id: true, name: true, email: true },
    });
    const bucarat = users.find(u => u.email === 'jm.bucarat@mep-projects.com') || users[0];
    const enrique = users.find(u => u.email === 'enrique.gallego@mep-projects.com') || users[1] || users[0];
    const fran = users.find(u => u.email === 'fran.gallego@mep-projects.com') || users[2] || users[0];
    const carmen = users.find(u => u.email === 'carmen.lay@mep-projects.com') || users[3] || users[0];

    console.log(`✅ Empresa: ${company.name}`);
    console.log(`👥 Usuarios disponibles: ${users.length}\n`);

    // =============================================
    // CLIENTES REALES
    // =============================================
    const clientsData = [
        {
            name: 'LANTANIA S.A.',
            email: 'comercial@lantania.es',
            phone: '+34 91 555 0001',
            companyName: 'LANTANIA S.A.',
            industry: 'Construcción e Infraestructuras',
            website: 'https://www.lantania.com',
            address: 'Calle Orense 34, 28020 Madrid',
            notes: 'Cliente principal del sector infraestructuras. Proyectos de gran envergadura en obra civil y medio ambiente.',
            status: 'ACTIVE' as const,
        },
        {
            name: 'GSL Ingeniería',
            email: 'proyectos@gsl.es',
            phone: '+34 91 555 0002',
            companyName: 'GSL Ingeniería S.L.',
            industry: 'Ingeniería y Consultoría',
            website: 'https://www.gsl.es',
            address: 'Paseo de la Castellana 89, 28046 Madrid',
            notes: 'Especialistas en instalaciones industriales. Colaboración frecuente en proyectos de instrumentación.',
            status: 'ACTIVE' as const,
        },
        {
            name: 'SERVEO Servicios',
            email: 'contratos@serveo.es',
            phone: '+34 91 555 0003',
            companyName: 'SERVEO Servicios S.A.',
            industry: 'Servicios e Infraestructuras',
            website: 'https://www.serveo.es',
            address: 'Carretera de Fuencarral 62, 28108 Alcobendas',
            notes: 'Gran cliente de mantenimiento y operación de instalaciones. Contratos de larga duración.',
            status: 'ACTIVE' as const,
        },
        {
            name: 'COX Energía',
            email: 'ingenieria@cox.es',
            phone: '+34 95 555 0004',
            companyName: 'COX Energía S.A.',
            industry: 'Energía y Medio Ambiente',
            website: 'https://www.cox.es',
            address: 'Avda. de Innovación 1, 41015 Sevilla',
            notes: 'Especialistas en energía renovable y plantas de tratamiento. Proyectos de eléctrico e I&C.',
            status: 'ACTIVE' as const,
        },
        {
            name: 'Grupo Cobra',
            email: 'licitaciones@grupocobra.com',
            phone: '+34 91 555 0005',
            companyName: 'Grupo Cobra S.A.',
            industry: 'Construcción, Energía y TIC',
            website: 'https://www.grupocobra.com',
            address: 'Calle Alcalá 45, 28014 Madrid',
            notes: 'Filial de ACS. Ingeniería de gran escala en redes eléctricas, telecomunicaciones y energías renovables.',
            status: 'ACTIVE' as const,
        },
    ];

    const createdClients: any[] = [];

    for (const clientData of clientsData) {
        // Upsert: sólo crear si no existe ya con ese email en la compañía
        let client = await prisma.client.findFirst({
            where: { companyId: company.id, email: clientData.email }
        });
        if (!client) {
            client = await prisma.client.create({
                data: { ...clientData, companyId: company.id, isActive: true }
            });
            console.log(`✅ Cliente creado: ${client.name}`);
        } else {
            console.log(`⏭️  Cliente ya existía: ${client.name}`);
        }
        createdClients.push(client);
    }

    const [lantania, gsl, serveo, cox, cobra] = createdClients;

    // =============================================
    // CONTACTOS POR CLIENTE
    // =============================================
    const contacts = [
        // Lantania
        { clientId: lantania.id, name: 'Pedro Fernández', position: 'Director de Proyectos', email: 'p.fernandez@lantania.es', phone: '+34 610 001 001', isPrimary: true },
        { clientId: lantania.id, name: 'Lucía Marcos', position: 'Jefa de Compras', email: 'l.marcos@lantania.es', phone: '+34 610 001 002', isPrimary: false },
        // GSL
        { clientId: gsl.id, name: 'Alberto Ruiz', position: 'Gerente Técnico', email: 'a.ruiz@gsl.es', phone: '+34 620 002 001', isPrimary: true },
        // Serveo
        { clientId: serveo.id, name: 'Carmen Torres', position: 'Responsable de Contratos', email: 'c.torres@serveo.es', phone: '+34 630 003 001', isPrimary: true },
        { clientId: serveo.id, name: 'Ignacio Blanco', position: 'Project Manager', email: 'i.blanco@serveo.es', phone: '+34 630 003 002', isPrimary: false },
        // COX
        { clientId: cox.id, name: 'Rosa Jiménez', position: 'Responsable de Ingeniería', email: 'r.jimenez@cox.es', phone: '+34 640 004 001', isPrimary: true },
        // Cobra
        { clientId: cobra.id, name: 'Eduardo Molina', position: 'Director de Licitaciones', email: 'e.molina@grupocobra.com', phone: '+34 650 005 001', isPrimary: true },
        { clientId: cobra.id, name: 'Silvia Castro', position: 'Jefa de Proyectos', email: 's.castro@grupocobra.com', phone: '+34 650 005 002', isPrimary: false },
    ];

    for (const contact of contacts) {
        const exists = await prisma.clientContact.findFirst({ where: { clientId: contact.clientId, email: contact.email } });
        if (!exists) {
            await prisma.clientContact.create({ data: contact });
        }
    }
    console.log('\n✅ Contactos de clientes creados\n');

    // =============================================
    // PIPELINE STAGES (si no existen)
    // =============================================
    const stageCount = await prisma.crmPipelineStage.count({ where: { companyId: company.id } });
    let stages: any[] = [];
    if (stageCount === 0) {
        await prisma.crmPipelineStage.createMany({
            data: [
                { companyId: company.id, name: 'Nuevo', order: 1, color: '#3b82f6' },
                { companyId: company.id, name: 'Cualificado', order: 2, color: '#8b5cf6' },
                { companyId: company.id, name: 'Propuesta Enviada', order: 3, color: '#f59e0b' },
                { companyId: company.id, name: 'Negociación', order: 4, color: '#ec4899' },
                { companyId: company.id, name: 'Ganado', order: 5, color: '#22c55e', isWon: true },
            ]
        });
    }
    stages = await prisma.crmPipelineStage.findMany({ where: { companyId: company.id }, orderBy: { order: 'asc' } });
    const [stageNuevo, stageCualif, stagePropuesta, stageNegoc, stageGanado] = stages;

    // =============================================
    // LEADS REALISTAS (basados en el sector MEP)
    // =============================================
    const leadsData = [
        // LANTANIA
        {
            title: 'Proyecto Eléctrico Planta Lantania Norte',
            description: 'Ingeniería de detalle de la instalación eléctrica BT/AT para la nueva planta industrial en Guadalajara.',
            value: 180000, probability: 75, stage: 'NEGOTIATION',
            clientId: lantania.id, assignedToId: bucarat.id, pipelineStageId: stageNegoc?.id,
            source: 'Relación existente',
            expectedCloseDate: new Date('2025-06-30'),
        },
        {
            title: 'Instrumentación y Control - EDAR Lantania Sur',
            description: 'Diseño de sistemas I&C para estación depuradora. Incluye SCADA y PLC Allen Bradley.',
            value: 95000, probability: 60, stage: 'PROPOSAL',
            clientId: lantania.id, assignedToId: enrique.id, pipelineStageId: stagePropuesta?.id,
            source: 'Licitación pública',
            expectedCloseDate: new Date('2025-07-15'),
        },
        // GSL
        {
            title: 'Auditoría Técnica Instalaciones GSL Madrid',
            description: 'Revisión completa de instalaciones eléctricas según Reglamento de Baja Tensión.',
            value: 28000, probability: 85, stage: 'NEGOTIATION',
            clientId: gsl.id, assignedToId: bucarat.id, pipelineStageId: stageNegoc?.id,
            source: 'Recomendación',
            expectedCloseDate: new Date('2025-05-31'),
        },
        {
            title: 'Diseño Civil Nave Industrial GSL Alcalá',
            description: 'Proyecto de nave logística 8.000m². Estructura metálica y cubierta.',
            value: 220000, probability: 40, stage: 'QUALIFIED',
            clientId: gsl.id, assignedToId: fran.id, pipelineStageId: stageCualif?.id,
            source: 'Prospección comercial',
            expectedCloseDate: new Date('2025-09-30'),
        },
        // SERVEO
        {
            title: 'Mantenimiento Preventivo Instalaciones Serveo 2025',
            description: 'Contrato de mantenimiento anual para 12 instalaciones en Madrid y alrededores.',
            value: 145000, probability: 90, stage: 'NEGOTIATION',
            clientId: serveo.id, assignedToId: carmen.id, pipelineStageId: stageNegoc?.id,
            source: 'Renovación contrato',
            expectedCloseDate: new Date('2025-04-30'),
        },
        {
            title: 'Ampliación SCADA Sistema Serveo Centro',
            description: 'Extensión del sistema de supervisión a 4 nuevos centros de control.',
            value: 67000, probability: 55, stage: 'PROPOSAL',
            clientId: serveo.id, assignedToId: enrique.id, pipelineStageId: stagePropuesta?.id,
            source: 'Upsell cliente existente',
            expectedCloseDate: new Date('2025-08-15'),
        },
        // COX
        {
            title: 'Ingeniería Parque Solar COX Badajoz',
            description: '50MW fotovoltaico. Ingeniería eléctrica de detalle, celdas MT y evacuación.',
            value: 350000, probability: 65, stage: 'PROPOSAL',
            clientId: cox.id, assignedToId: bucarat.id, pipelineStageId: stagePropuesta?.id,
            source: 'Licitación privada',
            expectedCloseDate: new Date('2025-06-15'),
        },
        {
            title: 'Instrumentación Planta Biogás COX Huelva',
            description: 'Detalle de instrumentación para planta de biogás 2MW. Incluye análisis de gases.',
            value: 42000, probability: 70, stage: 'QUALIFIED',
            clientId: cox.id, assignedToId: fran.id, pipelineStageId: stageCualif?.id,
            source: 'Referencia proyecto anterior',
            expectedCloseDate: new Date('2025-07-31'),
        },
        // COBRA
        {
            title: 'Diseño Red Eléctrica MT Cobra - Proyecto Eólico',
            description: 'Ingeniería de red de media tensión para parque eólico 80MW en Zaragoza.',
            value: 480000, probability: 50, stage: 'PROPOSAL',
            clientId: cobra.id, assignedToId: bucarat.id, pipelineStageId: stagePropuesta?.id,
            source: 'Licitación pública',
            expectedCloseDate: new Date('2025-08-31'),
        },
        {
            title: 'Consultoría Normativa Cobra TIC',
            description: 'Revisión de cumplimiento normativo en instalaciones de telecomunicaciones.',
            value: 18000, probability: 80, stage: 'NEW',
            clientId: cobra.id, assignedToId: enrique.id, pipelineStageId: stageNuevo?.id,
            source: 'Contacto directo',
            expectedCloseDate: new Date('2025-05-15'),
        },
        // Lead ganado (histórico)
        {
            title: 'Proyecto Finalizado - Subestación Lantania 2024',
            description: 'Ingeniería completa de subestación 66/20kV. Proyecto entregado con éxito.',
            value: 230000, probability: 100, stage: 'CLOSED_WON',
            clientId: lantania.id, assignedToId: bucarat.id,
            source: 'Licitación privada',
            expectedCloseDate: new Date('2024-12-31'),
        },
        {
            title: 'Proyecto Cancelado - Planta GSL Cataluña',
            description: 'Proyecto no adjudicado por presupuesto. Cliente optó por competidora local.',
            value: 110000, probability: 0, stage: 'CLOSED_LOST',
            clientId: gsl.id, assignedToId: fran.id,
            lostReason: 'Precio no competitivo frente a empresa local',
            source: 'Licitación pública',
            expectedCloseDate: new Date('2024-11-30'),
        },
    ];

    const createdLeads: any[] = [];
    for (const leadData of leadsData) {
        const exists = await prisma.lead.findFirst({ where: { companyId: company.id, title: leadData.title } });
        if (!exists) {
            const lead = await prisma.lead.create({
                data: { ...leadData, companyId: company.id, stage: leadData.stage as any, value: leadData.value as any }
            });
            createdLeads.push(lead);
            console.log(`✅ Lead: ${lead.title}`);
        } else {
            createdLeads.push(exists);
            console.log(`⏭️  Lead ya existía: ${exists.title}`);
        }
    }

    // =============================================
    // ACTIVIDADES CRM REALISTAS
    // =============================================
    const activitiesData = [
        {
            type: 'CALL' as const,
            title: 'Llamada inicial con Pedro Fernández (Lantania)',
            description: 'Revisión de necesidades para proyecto eléctrico en planta Norte. Confirman inicio en Q2.',
            leadId: createdLeads[0].id, clientId: lantania.id,
            createdById: bucarat.id, date: new Date('2025-02-10'), completed: true,
        },
        {
            type: 'MEETING' as const,
            title: 'Reunión presencial en oficinas Lantania Madrid',
            description: 'Presentación del equipo MEP y alcance técnico de la propuesta eléctrica.',
            leadId: createdLeads[0].id, clientId: lantania.id,
            createdById: bucarat.id, date: new Date('2025-02-20'), completed: true,
        },
        {
            type: 'EMAIL' as const,
            title: 'Envío de propuesta técnico-económica Lantania EDAR Sur',
            description: 'Propuesta enviada por email. Valor: 95.000€. Pendiente respuesta.',
            leadId: createdLeads[1].id, clientId: lantania.id,
            createdById: enrique.id, date: new Date('2025-02-28'), completed: true,
        },
        {
            type: 'CALL' as const,
            title: 'Seguimiento oferta GSL Auditoría',
            description: 'Llamada de seguimiento con Alberto Ruiz. Muy interesados. Piden ajuste de plazo.',
            leadId: createdLeads[2].id, clientId: gsl.id,
            createdById: bucarat.id, date: new Date('2025-03-01'), completed: true,
        },
        {
            type: 'WHATSAPP' as const,
            title: 'WhatsApp confirmación reunión COX Badajoz',
            description: 'Confirmado: reunión el martes 11/03 a las 11h en Badajoz para revisar el alcance del solar.',
            leadId: createdLeads[6].id, clientId: cox.id,
            createdById: bucarat.id, date: new Date('2025-03-03'), completed: true,
        },
        {
            type: 'MEETING' as const,
            title: 'Kick-off renovación contrato Serveo 2025',
            description: 'Reunión con Carmen Torres. Confirman renovación anual. Pendiente firma de contrato.',
            leadId: createdLeads[4].id, clientId: serveo.id,
            createdById: carmen.id, date: new Date('2025-03-04'), completed: true,
        },
        {
            type: 'TASK' as const,
            title: 'Preparar documentación técnica oferta Cobra Eólico',
            description: 'Recopilar planos as-built, normativa aplicable y estudio de carga para la propuesta.',
            leadId: createdLeads[8].id, clientId: cobra.id,
            createdById: bucarat.id, date: new Date('2025-03-06'), completed: false,
        },
        {
            type: 'EMAIL' as const,
            title: 'Follow-up propuesta Inversión Serveo SCADA',
            description: 'Email de seguimiento 2 semanas después del envío. Sin respuesta aún.',
            leadId: createdLeads[5].id, clientId: serveo.id,
            createdById: enrique.id, date: new Date('2025-03-05'), completed: true,
        },
        {
            type: 'NOTE' as const,
            title: 'Nota interna: Cobra solicita desglose por capítulos',
            description: 'Eduardo Molina pide que la propuesta incluya desglose por fases. Prioritario esta semana.',
            leadId: createdLeads[8].id, clientId: cobra.id,
            createdById: bucarat.id, date: new Date('2025-03-05'), completed: false,
        },
        {
            type: 'CALL' as const,
            title: 'Reunión telefónica COX - Biogás Huelva',
            description: 'Rosa Jiménez confirma interés. Solicita visita técnica a la planta antes de finalizar propuesta.',
            leadId: createdLeads[7].id, clientId: cox.id,
            createdById: fran.id, date: new Date('2025-03-02'), completed: true,
        },
    ];

    for (const act of activitiesData) {
        const exists = await prisma.crmActivity.findFirst({
            where: { companyId: company.id, title: act.title }
        });
        if (!exists) {
            await prisma.crmActivity.create({ data: { ...act, companyId: company.id } });
        }
    }
    console.log('\n✅ Actividades CRM creadas\n');

    // =============================================
    // RESUMEN
    // =============================================
    console.log('🎉 Seed CRM completado:');
    console.log(`   • ${createdClients.length} clientes`);
    console.log(`   • ${createdLeads.length} leads/oportunidades`);
    console.log(`   • ${activitiesData.length} actividades CRM`);
    console.log(`   • Pipeline con ${stages.length} etapas\n`);
}

main()
    .catch(e => { console.error('❌ Error:', e); process.exit(1); })
    .finally(async () => await prisma.$disconnect());
