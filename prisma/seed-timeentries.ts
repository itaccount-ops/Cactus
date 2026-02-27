import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed REAL time entries for MEP employees
 * Run: npx tsx prisma/seed-timeentries.ts
 */

// Time entries for Ester
const esterEntries = [
    { date: '2026-01-02', notes: 'vacaciones', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: 'vacaciones', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-07', notes: 'vacaciones', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-08', notes: 'Puesta a punto tras vacaciones + reuniones etc', projectCode: 'G-21-901', hours: 5 },
    { date: '2026-01-08', notes: 'izharia', projectCode: 'P-25-358', hours: 1 },
    { date: '2026-01-08', notes: 'ofertas', projectCode: 'O-21-802', hours: 2.5 },
    { date: '2026-01-09', notes: 'ofertas', projectCode: 'O-21-802', hours: 3 },
    { date: '2026-01-09', notes: 'mejoras internas', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-01-12', notes: 'reuniones con trabajadores personales', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-12', notes: 'Preparación formatos curriculum + ofertas', projectCode: 'O-21-802', hours: 3 },
    { date: '2026-01-12', notes: 'revisión hvac', projectCode: 'P-25-384', hours: 2 },
    { date: '2026-01-13', notes: 'Reuniones personales', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-13', notes: 'ofertas', projectCode: 'O-21-802', hours: 3 },
    { date: '2026-01-13', notes: 'GSL revisión y explicación Juanpi', projectCode: 'P-25-399', hours: 1 },
    { date: '2026-01-13', notes: 'Documento PM + Maye', projectCode: 'G-21-901', hours: 1.25 },
    { date: '2026-01-14', notes: 'reuniones con trabajadores personales', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-14', notes: 'OFERTAS', projectCode: 'O-21-802', hours: 5 },
    { date: '2026-01-14', notes: 'EXPLICACIONES TRABAJADORES Y DEMAS GENERAL', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-15', notes: 'PRODUCCIÓN REUNIÓN', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-15', notes: 'REUNIONES con trabajadores personales', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-15', notes: 'OFERTAS', projectCode: 'O-21-802', hours: 4 },
    { date: '2026-01-15', notes: 'Análisis de proyectos general', projectCode: 'G-21-901', hours: 0.75 },
    { date: '2026-01-15', notes: 'PREPRAC. Y CONV. VICTOR', projectCode: 'O-21-802', hours: 0.3 },
    { date: '2026-01-16', notes: 'ofertas genericas', projectCode: 'O-21-802', hours: 6 },
    { date: '2026-01-16', notes: 'izharia', projectCode: 'P-25-358', hours: 0.75 },
    { date: '2026-01-16', notes: 'tpf', projectCode: 'P-25-326', hours: 0.35 },
    { date: '2026-01-19', notes: 'reunión lantania', projectCode: 'O-21-802', hours: 6 },
    { date: '2026-01-19', notes: 'Preparación personal + prepar. lantania', projectCode: 'P-26-401', hours: 2 },
    { date: '2026-01-20', notes: 'lantania. sharepoint, arranque+ reuniones+etc', projectCode: 'P-26-401', hours: 6 },
    { date: '2026-01-20', notes: 'izharia', projectCode: 'P-24-287', hours: 2.5 },
    { date: '2026-01-21', notes: 'gesnaer', projectCode: 'P-25-374', hours: 1.5 },
    { date: '2026-01-21', notes: 'preparación reunión producción trimestral', projectCode: 'G-21-901', hours: 6 },
    { date: '2026-01-21', notes: 'reunión previsión mensual prep+ reunión', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-22', notes: 'reunión producción trimestral', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-01-22', notes: 'reunión Daikin', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-22', notes: 'TPF', projectCode: 'P-25-326', hours: 2.5 },
    { date: '2026-01-22', notes: 'REUNIÓN DE PRODUCCIÓN', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-23', notes: 'TPF', projectCode: 'P-25-326', hours: 1.5 },
    { date: '2026-01-23', notes: 'izharia', projectCode: 'P-24-287', hours: 1.5 },
    { date: '2026-01-23', notes: 'LANTANIA ELÉCTRICA', projectCode: 'P-26-401', hours: 2.5 },
    { date: '2026-01-23', notes: 'REUNIONES VARIAS Y PREPARACIONES DE ESTANDARES ETC', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-23', notes: 'GESNAER', projectCode: 'P-25-374', hours: 1.5 },
    { date: '2026-01-26', notes: 'Lantania ELECTRICA', projectCode: 'P-26-401', hours: 3 },
    { date: '2026-01-26', notes: 'Ofertas genericas', projectCode: 'O-21-802', hours: 3 },
    { date: '2026-01-26', notes: 'REUNIONES VARIAS', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-27', notes: 'Reunión con INERCO', projectCode: 'O-21-802', hours: 2 },
    { date: '2026-01-27', notes: 'REUNIONES CON VICTOR', projectCode: 'O-21-802', hours: 1.5 },
    { date: '2026-01-27', notes: 'Lantania', projectCode: 'P-26-401', hours: 1.5 },
    { date: '2026-01-27', notes: 'izharia', projectCode: 'P-24-287', hours: 1 },
    { date: '2026-01-27', notes: 'Historias varias', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-28', notes: 'reunion con inerco otra vez', projectCode: 'O-21-802', hours: 1.5 },
    { date: '2026-01-28', notes: 'ofertas', projectCode: 'O-21-802', hours: 4 },
    { date: '2026-01-28', notes: 'lantania', projectCode: 'P-26-401', hours: 1.5 },
    { date: '2026-01-28', notes: 'TPF', projectCode: 'P-25-326', hours: 1.5 },
    { date: '2026-01-29', notes: 'REUNIONES Y ATENCIONES DE GESTIÓN', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-29', notes: 'LANTANIA', projectCode: 'P-26-401', hours: 2 },
    { date: '2026-01-29', notes: 'OFERTAS', projectCode: 'O-21-802', hours: 4 },
    { date: '2026-01-29', notes: 'R.PRODUCCIÓN', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-30', notes: 'REUNIÓN SACYR', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-30', notes: 'CIERRE DE MES (PERSEGUIR Y CERRAR CERTIFICACIONES)', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-30', notes: 'tpf', projectCode: 'P-25-326', hours: 1.5 },
    { date: '2026-01-30', notes: 'izharia', projectCode: 'P-24-287', hours: 1 },
    { date: '2026-01-30', notes: 'lantania', projectCode: 'P-26-401', hours: 1.6 },
    { date: '2026-02-02', notes: 'Lantania', projectCode: 'P-26-401', hours: 2.5 },
    { date: '2026-02-02', notes: 'izharia', projectCode: 'P-24-287', hours: 0.5 },
    { date: '2026-02-02', notes: 'tpf', projectCode: 'P-25-326', hours: 0.75 },
    { date: '2026-02-02', notes: 'ofertas', projectCode: 'O-21-802', hours: 3.5 },
    { date: '2026-02-02', notes: 'reuniones varias', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-02-03', notes: 'lantania', projectCode: 'P-26-401', hours: 3.5 },
    { date: '2026-02-03', notes: 'ofertas', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-02-03', notes: 'historias varias', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-02-04', notes: 'lantania', projectCode: 'P-26-401', hours: 2 },
    { date: '2026-02-04', notes: 'tpf', projectCode: 'P-25-326', hours: 1.5 },
    { date: '2026-02-04', notes: 'oferta Fran g.', projectCode: 'O-21-802', hours: 3.5 },
    { date: '2026-02-04', notes: 'ofertas genericas', projectCode: 'O-21-802', hours: 1.2 },
];

// Time entries for Javier Jiménez
const javierEntries = [
    { date: '2026-01-02', notes: 'BESS y Linea de Evac', projectCode: 'P-25-399', hours: 8 },
    { date: '2026-01-05', notes: 'BESS y Linea de Evac', projectCode: 'P-25-399', hours: 5.5 },
    { date: '2026-01-07', notes: 'BESS y Linea de Evac', projectCode: 'P-25-399', hours: 8.5 },
    { date: '2026-01-08', notes: 'BESS y Linea de Evac', projectCode: 'P-25-399', hours: 8.5 },
    { date: '2026-01-09', notes: 'BESS y Linea de Evac', projectCode: 'P-25-399', hours: 7 },
    { date: '2026-01-12', notes: 'BESS y Linea de Evac', projectCode: 'P-25-399', hours: 5 },
    { date: '2026-01-12', notes: 'Ampliación', projectCode: 'P-25-378', hours: 4 },
    { date: '2026-01-13', notes: 'Ampliación', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-14', notes: 'Ampliación', projectCode: 'P-25-378', hours: 8.5 },
    { date: '2026-01-15', notes: 'Ampliación', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-16', notes: 'Ampliación', projectCode: 'P-25-378', hours: 7 },
    { date: '2026-01-19', notes: 'Presupuesto', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-19', notes: 'Formacion IC y subestaciones', projectCode: 'G-22-902', hours: 6.5 },
    { date: '2026-01-20', notes: 'Formacion IC y subestaciones', projectCode: 'G-22-902', hours: 3 },
    { date: '2026-01-20', notes: 'Comentarios', projectCode: 'P-25-378', hours: 2 },
    { date: '2026-01-20', notes: 'Revision listas', projectCode: 'P-26-401', hours: 3 },
    { date: '2026-01-21', notes: 'Comentarios', projectCode: 'P-25-380', hours: 2 },
    { date: '2026-01-21', notes: 'Comentarios', projectCode: 'P-25-378', hours: 2 },
    { date: '2026-01-21', notes: 'Revision listas', projectCode: 'P-26-401', hours: 5 },
    { date: '2026-01-22', notes: 'Comentarios', projectCode: 'P-25-380', hours: 1 },
    { date: '2026-01-22', notes: 'Revision listas', projectCode: 'P-26-401', hours: 7 },
    { date: '2026-01-23', notes: 'Formacion IC, EPLAN y subestaciones', projectCode: 'G-22-902', hours: 7 },
    { date: '2026-01-26', notes: 'Formacion IC, EPLAN y subestaciones', projectCode: 'G-22-902', hours: 9 },
    { date: '2026-01-27', notes: 'Formacion IC, EPLAN y subestaciones', projectCode: 'G-22-902', hours: 9 },
    { date: '2026-01-28', notes: 'Formacion IC, EPLAN y subestaciones', projectCode: 'G-22-902', hours: 8 },
    { date: '2026-01-29', notes: 'Formacion IC, EPLAN y subestaciones', projectCode: 'G-22-902', hours: 8 },
    { date: '2026-01-30', notes: 'Formacion IC, EPLAN y subestaciones', projectCode: 'G-22-902', hours: 7 },
    { date: '2026-02-02', notes: 'Lantania', projectCode: 'P-26-401', hours: 9 },
    { date: '2026-02-03', notes: 'Lantania', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-04', notes: 'Lantania', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-05', notes: 'Lantania', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-06', notes: 'Lantania', projectCode: 'P-26-401', hours: 7 },
];

// Time entries for Jessica
const jessicaEntries = [
    { date: '2026-01-02', notes: 'vacaciones', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 5.5 },
    { date: '2026-01-05', notes: 'salida extraordinaria día de reyes', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-07', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 4 },
    { date: '2026-01-07', notes: '336_topologia de control Balwin, Lanwin comentarios Daniel', projectCode: 'P-25-336', hours: 5 },
    { date: '2026-01-08', notes: '336_topologia de control Balwin, Lanwin comentarios Daniel', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-09', notes: '336_topologia de control Balwin, Lanwin comentarios Daniel / 336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-09', notes: 'hora bolsa de horas', projectCode: 'G-22-903', hours: 1 },
    { date: '2026-01-12', notes: 'asuntos propios', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-13', notes: '336_Topologia Daniel Balwin_ Arrangement Drawing HVAC', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-14', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-14', notes: 'hora bolsa de horas', projectCode: 'G-22-903', hours: 1 },
    { date: '2026-01-15', notes: 'vacaciones_medico leyre', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-16', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-16', notes: 'hora bolsa de horas', projectCode: 'G-22-903', hours: 1 },
    { date: '2026-01-19', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-19', notes: 'hora bolsa de horas', projectCode: 'G-22-903', hours: 1 },
    { date: '2026-01-20', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-20', notes: 'hora bolsa de horas', projectCode: 'G-22-903', hours: 1 },
    { date: '2026-01-21', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-22', notes: '336_Arrangement Drawing HVAC_Balwin', projectCode: 'P-25-336', hours: 6 },
    { date: '2026-01-22', notes: '403_GLS MONTES_Planos', projectCode: 'P-26-403', hours: 1 },
    { date: '2026-01-23', notes: '403_GLS MONTES_Planos', projectCode: 'P-26-403', hours: 7 },
    { date: '2026-01-23', notes: 'hora bolsa de horas', projectCode: 'G-22-903', hours: 2 },
    { date: '2026-01-26', notes: '403_GLS MONTES_Planos', projectCode: 'P-26-403', hours: 8 },
    { date: '2026-01-27', notes: '403_GLS MONTES_Planos_Línea', projectCode: 'P-26-403', hours: 10 },
    { date: '2026-01-28', notes: '403_GLS MONTES_Planos_4,1_4,2', projectCode: 'P-26-403', hours: 7 },
    { date: '2026-01-29', notes: '403_GLS MONTES_PLANOS', projectCode: 'P-26-403', hours: 8 },
    { date: '2026-01-30', notes: '336_Arrangement Drawing HVAC_Lanwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-02-02', notes: '336_Arrangement Drawing HVAC_Lanwin', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-02-03', notes: '336_Arrangement Drawing HVAC_Lanwin', projectCode: 'P-25-336', hours: 9 },
    { date: '2026-02-04', notes: '336_Arrangement Drawing HVAC_Lanwin', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-02-05', notes: '336_Arrangement Drawing HVAC_Lanwin', projectCode: 'P-25-336', hours: 11.25 },
];

// Time entries for Marina
const marinaEntries = [
    { date: '2026-01-02', notes: '', projectCode: 'P-25-399', hours: 7 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-399', hours: 5.5 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-399', hours: 8.5 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-399', hours: 8.5 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-399', hours: 7 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-399', hours: 2.5 },
    { date: '2026-01-12', notes: '', projectCode: 'P-24-252', hours: 6 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-398', hours: 8.5 },
    { date: '2026-01-14', notes: '', projectCode: 'P-24-252', hours: 8 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-378', hours: 7 },
    { date: '2026-01-19', notes: '', projectCode: 'P-25-378', hours: 8.5 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-374', hours: 5.5 },
    { date: '2026-01-20', notes: '', projectCode: 'P-26-401', hours: 3 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-374', hours: 1.5 },
    { date: '2026-01-21', notes: '', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-21', notes: '', projectCode: 'P-26-401', hours: 5 },
    { date: '2026-01-22', notes: '', projectCode: 'P-26-401', hours: 6 },
    { date: '2026-01-22', notes: '', projectCode: 'G-22-902', hours: 2 },
    { date: '2026-01-23', notes: '', projectCode: 'P-26-401', hours: 3.5 },
    { date: '2026-01-23', notes: '', projectCode: 'G-22-902', hours: 3.5 },
    { date: '2026-01-26', notes: '', projectCode: 'G-22-902', hours: 8.5 },
    { date: '2026-01-27', notes: '', projectCode: 'G-22-902', hours: 8.5 },
    { date: '2026-01-28', notes: '', projectCode: 'G-22-902', hours: 8 },
    { date: '2026-01-29', notes: '', projectCode: 'G-22-902', hours: 8 },
    { date: '2026-01-30', notes: '', projectCode: 'G-22-902', hours: 7 },
];

// Time entries for Juan Pablo
const juanPabloEntries = [
    { date: '2026-01-02', notes: 'VACACIONES', projectCode: 'G-22-903', hours: 6.5 },
    { date: '2026-01-05', notes: 'Macros en Documentos + Terminar Memoria y Separatas de todos los agrupamientos + Comienzo Línea', projectCode: 'P-25-399', hours: 5 },
    { date: '2026-01-07', notes: 'Macros en Documentos + Terminar Memoria y Separatas de Línea + Presupuesto', projectCode: 'P-25-399', hours: 6.5 },
    { date: '2026-01-08', notes: 'Arreglo Referencia Catastral y Municipio + Publicación de PDFs + Presupuesto', projectCode: 'P-25-399', hours: 6.5 },
    { date: '2026-01-09', notes: 'Macro + Montaje de Documentos + Preparación Enviado al Cliente', projectCode: 'P-25-399', hours: 6.5 },
    { date: '2026-01-12', notes: 'Ajuste Documentos Línea + Separata General + Preparación Enviado al Cliente', projectCode: 'P-25-399', hours: 3.5 },
    { date: '2026-01-12', notes: 'Modificaciones en Documentos Word, Excel y PDF (Declaraciones) tras ajuste en la implantación', projectCode: 'P-25-398', hours: 2.5 },
    { date: '2026-01-12', notes: 'Reunión Anual de Seguimiento', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-13', notes: 'Revisión Separata General', projectCode: 'P-25-399', hours: 1.5 },
    { date: '2026-01-13', notes: 'Modificación Documentos en Agrupamientos + Macros + Separata General', projectCode: 'P-25-398', hours: 5 },
    { date: '2026-01-14', notes: 'Modificación Documentos en Línea + Macros + Separata General + Preparación Enviado al Cliente', projectCode: 'P-25-398', hours: 6.5 },
    { date: '2026-01-15', notes: 'Revisión de Normativa en todos los documentos PTA BESS, para próximas entregas', projectCode: 'P-26-403', hours: 3 },
    { date: '2026-01-15', notes: 'Revisión Unifilar General', projectCode: 'P-25-298', hours: 0.25 },
    { date: '2026-01-15', notes: 'Escuela de Empresa', projectCode: 'G-22-902', hours: 0.75 },
    { date: '2026-01-15', notes: 'Cálculo de cable + Memoria de MT', projectCode: 'P-25-298', hours: 2.5 },
    { date: '2026-01-16', notes: 'Cálculo de cable + Memoria de MT', projectCode: 'P-25-298', hours: 6.5 },
    { date: '2026-01-19', notes: 'Cálculo de cable + Memoria BT DC', projectCode: 'P-25-298', hours: 6.5 },
    { date: '2026-01-20', notes: 'Introducción al proyecto con Miguel C + P&ID', projectCode: 'P-26-401', hours: 5.5 },
    { date: '2026-01-20', notes: 'Cálculo de cable + Memoria BT DC', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-21', notes: 'Revisión P&ID + Comentarios Señales (1 y 17-19)', projectCode: 'P-26-401', hours: 5.5 },
    { date: '2026-01-21', notes: 'Lógica Cableada', projectCode: 'G-22-902', hours: 1 },
    { date: '2026-01-22', notes: 'Revisión P&ID + Comentarios Señales (2-5) + Reunión para unificar criterio', projectCode: 'P-26-401', hours: 6.5 },
    { date: '2026-01-23', notes: 'Unificar P&ID y listas + Revisión', projectCode: 'P-26-401', hours: 1 },
    { date: '2026-01-23', notes: 'Organización de Proyecto con Teresa + Revisión de Cálculos y Documentos de Línea', projectCode: 'P-26-403', hours: 5.5 },
    { date: '2026-01-26', notes: 'Macros + Revisión de Documentos', projectCode: 'P-26-403', hours: 6.5 },
    { date: '2026-01-27', notes: 'Examen', projectCode: 'G-22-903', hours: 6.5 },
    { date: '2026-01-28', notes: 'Revisión Documentos + Publicar', projectCode: 'P-26-403', hours: 6.5 },
    { date: '2026-01-29', notes: 'Revisión 2 + Publicar + Montaje Documentos + Enviado al Cliente Agrupamientos', projectCode: 'P-26-403', hours: 6.5 },
    { date: '2026-01-30', notes: 'Revisión + Enviado al Cliente Línea', projectCode: 'P-26-403', hours: 3.5 },
    { date: '2026-01-30', notes: 'Comienzo Proyecto Macros', projectCode: 'P-26-406', hours: 3 },
    { date: '2026-02-02', notes: 'Examen', projectCode: 'G-22-903', hours: 6.5 },
    { date: '2026-02-03', notes: 'Macros + Coordenadas + Presupuesto + ETC', projectCode: 'P-26-406', hours: 6.5 },
    { date: '2026-02-04', notes: 'Duplicado de Memoria, Separatas y Cálculos + Macro + Línea + Organismos Afectados', projectCode: 'P-26-406', hours: 6.5 },
    { date: '2026-02-05', notes: 'Examen', projectCode: 'G-22-903', hours: 6.5 },
    { date: '2026-02-06', notes: 'Examen', projectCode: 'G-22-903', hours: 6.5 },
];

// Time entries for José Manuel Canga
const joseManuelEntries = [
    { date: '2026-01-02', notes: 'TRAZADO LÍNEA BENALMADENA Y RBDA', projectCode: 'P-25-399', hours: 3.5 },
    { date: '2026-01-02', notes: 'LICENCIA BAR-AMBIGU', projectCode: 'P-25-391', hours: 2 },
    { date: '2026-01-05', notes: 'TRAZADO LÍNEA BENALMADENA', projectCode: 'P-25-399', hours: 2.5 },
    { date: '2026-01-05', notes: 'LICENCIA BAR-AMBIGU', projectCode: 'P-25-391', hours: 1.5 },
    { date: '2026-01-05', notes: 'DRENAJES PARKINGS AEROPUERTOS', projectCode: 'P-25-394', hours: 1 },
    { date: '2026-01-07', notes: 'VISUALIZACIÓN CURSO REVIT', projectCode: 'G-22-902', hours: 3.5 },
    { date: '2026-01-07', notes: 'DRENAJES INTECSA', projectCode: 'P-25-394', hours: 4.5 },
    { date: '2026-01-08', notes: 'VISUALIZACION CURSO REVIT', projectCode: 'G-22-902', hours: 3 },
    { date: '2026-01-08', notes: 'DRENAJES Y REVISIONES INTECSA', projectCode: 'P-25-394', hours: 5 },
    { date: '2026-01-09', notes: 'VISUALIZACION CURSO REVIT', projectCode: 'G-22-902', hours: 2.5 },
    { date: '2026-01-09', notes: 'LICENCIA ELEVEN VIEWS', projectCode: 'P-25-391', hours: 4 },
    { date: '2026-01-12', notes: 'RBDA. BESS BENALMADENA', projectCode: 'P-25-399', hours: 4 },
    { date: '2026-01-12', notes: 'DRENAJES AEROPUERTO TENERIFE', projectCode: 'P-25-394', hours: 2.5 },
    { date: '2026-01-12', notes: 'AEROPUERTO T2 BCN', projectCode: 'P-25-374', hours: 0.5 },
    { date: '2026-01-13', notes: 'DRENAJES AEROPUERTO TENERIFE', projectCode: 'P-25-394', hours: 5 },
    { date: '2026-01-13', notes: 'REUNIÓN JEREZOL', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-13', notes: 'PERFIL LÍNEA IZHAIRA', projectCode: 'P-25-358', hours: 1 },
    { date: '2026-01-14', notes: 'DRENAJES INTECSA', projectCode: 'P-25-394', hours: 2 },
    { date: '2026-01-14', notes: 'MEMORIA LICENCIA ELEVEN VIEWS', projectCode: 'P-25-391', hours: 4 },
    { date: '2026-01-14', notes: 'REUNIÓN ANUAL', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-15', notes: 'DRENAJES INTECSA', projectCode: 'P-25-394', hours: 1.5 },
    { date: '2026-01-15', notes: 'LICENCIA ELEVEN VIEWS', projectCode: 'P-25-391', hours: 5 },
    { date: '2026-01-15', notes: 'AEROPUERTO T2 BCN', projectCode: 'P-25-374', hours: 0.5 },
    { date: '2026-01-16', notes: 'DRENAJES INTECSA', projectCode: 'P-25-394', hours: 5 },
    { date: '2026-01-16', notes: 'HIDROLÓGICOS CANTERA Y LA PAUL', projectCode: 'P-25-322', hours: 0.5 },
    { date: '2026-01-16', notes: 'REUNIÓN PRODUCCIÓN', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-19', notes: 'FORMACIÓN CYPECAD', projectCode: 'G-22-902', hours: 8.5 },
    { date: '2026-01-20', notes: 'FORMACIÓN REVIT Y CYPE', projectCode: 'G-22-902', hours: 8.5 },
    { date: '2026-01-21', notes: 'FORMACIÓN REVIT Y CYPE', projectCode: 'G-22-902', hours: 8.5 },
    { date: '2026-01-22', notes: 'FORMACIÓN', projectCode: 'G-22-902', hours: 8 },
    { date: '2026-01-22', notes: 'REUNIÓN PRODUCCIÓN', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-23', notes: 'FORMACIÓN', projectCode: 'G-22-902', hours: 6 },
    { date: '2026-01-26', notes: 'FORMACIÓN', projectCode: 'G-22-902', hours: 5 },
    { date: '2026-01-26', notes: 'RBDA MONTES', projectCode: 'P-26-403', hours: 3.5 },
    { date: '2026-01-27', notes: 'LAYOUT MARYSOL', projectCode: 'P-26-405', hours: 4 },
    { date: '2026-01-27', notes: 'LAYOUT MANANTIALES', projectCode: 'P-26-406', hours: 4 },
    { date: '2026-01-28', notes: 'JEREZOL TOPOGRAFÍA', projectCode: 'P-25-298', hours: 2 },
    { date: '2026-01-28', notes: 'BESS MONTES', projectCode: 'P-26-403', hours: 2 },
    { date: '2026-01-28', notes: 'FORMACIÓN', projectCode: 'G-22-902', hours: 4.5 },
    { date: '2026-01-29', notes: 'JEREZOL PVCASE', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-29', notes: 'LAYOUTS MARYSOL', projectCode: 'P-26-405', hours: 2 },
    { date: '2026-01-29', notes: 'LAYOUT MANANTIALES', projectCode: 'P-26-406', hours: 2 },
    { date: '2026-01-29', notes: 'FORMACIÓN', projectCode: 'G-22-902', hours: 3.5 },
    { date: '2026-01-29', notes: 'REUNIÓN PRODUCCIÓN', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-30', notes: 'FORMACIÓN', projectCode: 'G-22-902', hours: 4.5 },
    { date: '2026-01-30', notes: 'CANTERAS Y LA PAUL', projectCode: 'P-25-322', hours: 1.5 },
];

// Time entries for Edgar
const edgarEntries = [
    { date: '2026-01-05', notes: '', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-336', hours: 9.5 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-336', hours: 9 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-336', hours: 6 },
    { date: '2026-01-19', notes: '', projectCode: 'P-25-336', hours: 9.5 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-22', notes: '', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-23', notes: '', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-26', notes: '', projectCode: 'P-25-336', hours: 9 },
    { date: '2026-01-27', notes: '', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-28', notes: '', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-29', notes: '', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-30', notes: '', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-02-02', notes: '', projectCode: 'P-25-336', hours: 10.5 },
];

// Time entries for Lorena
const lorenaEntries = [
    { date: '2026-01-02', notes: 'comentarios', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-05', notes: 'comentarios', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-07', notes: 'comentarios', projectCode: 'P-25-336', hours: 9 },
    { date: '2026-01-08', notes: 'comentarios', projectCode: 'P-25-336', hours: 4 },
    { date: '2026-01-08', notes: 'reunión anual', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-09', notes: 'comentarios', projectCode: 'P-25-336', hours: 9 },
    { date: '2026-01-10', notes: 'comentarios', projectCode: 'P-25-336', hours: 1.5 },
    { date: '2026-01-12', notes: 'comentarios', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-13', notes: 'comentarios', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-14', notes: 'comentarios', projectCode: 'P-25-336', hours: 5 },
    { date: '2026-01-14', notes: 'crear plano', projectCode: 'P-25-298', hours: 2 },
    { date: '2026-01-15', notes: 'comentarios', projectCode: 'P-25-336', hours: 3 },
    { date: '2026-01-15', notes: 'crear plano', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-15', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-15', notes: 'crear plano', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-15', notes: 'mejorar CV', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-15', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-15', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-16', notes: 'crear plano', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-16', notes: 'crear plano', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-16', notes: 'comentarios', projectCode: 'P-25-336', hours: 1.5 },
    { date: '2026-01-19', notes: 'crear plano', projectCode: 'P-25-298', hours: 2 },
    { date: '2026-01-19', notes: 'comentarios', projectCode: 'P-25-336', hours: 5.5 },
    { date: '2026-01-20', notes: 'comentarios', projectCode: 'P-25-336', hours: 6.5 },
    { date: '2026-01-20', notes: 'reunión departamento', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-21', notes: 'comentarios layout', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-21', notes: 'comentarios layout', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-21', notes: 'comentarios layout', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-21', notes: 'crear plano', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-21', notes: 'crear plano', projectCode: 'P-25-298', hours: 2 },
    { date: '2026-01-21', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-21', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-21', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-22', notes: 'crear referencia', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-22', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-22', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-22', notes: 'comentarios', projectCode: 'P-25-336', hours: 4 },
    { date: '2026-01-22', notes: 'Revit', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-23', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-23', notes: 'instalación y licencia Revit', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-23', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-23', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-23', notes: 'Revit', projectCode: 'G-22-902', hours: 2 },
    { date: '2026-01-26', notes: 'comentarios', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-26', notes: 'Revit', projectCode: 'G-22-902', hours: 6.5 },
    { date: '2026-01-27', notes: 'Revit', projectCode: 'G-22-902', hours: 3.5 },
    { date: '2026-01-27', notes: 'cambio layout', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-27', notes: 'cambio layout', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-27', notes: 'cambio layout', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-27', notes: 'cambio layout', projectCode: 'P-25-298', hours: 2.5 },
    { date: '2026-01-28', notes: 'crear plano', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-28', notes: 'Revit', projectCode: 'G-22-902', hours: 5.5 },
    { date: '2026-01-29', notes: 'Revit', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-29', notes: 'crear plano', projectCode: 'P-25-298', hours: 3 },
    { date: '2026-01-29', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-29', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-29', notes: 'crear plano', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-30', notes: 'Revit', projectCode: 'G-22-902', hours: 3.5 },
    { date: '2026-01-30', notes: 'comentarios', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-30', notes: 'crear plano', projectCode: 'P-25-298', hours: 3.5 },
    { date: '2026-02-02', notes: 'comentarios', projectCode: 'P-25-298', hours: 2 },
];

// Time entries for Mayte
const mayteEntries = [
    { date: '2026-01-02', notes: 'Vacaciones 2025', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: 'Vacaciones 2025', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-07', notes: 'Organización de trabajo, lectura de mails, puesta al día tras las vacaciones', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-07', notes: 'Revisión de planimetría de BESS y modificación de documentos', projectCode: 'P-25-399', hours: 3.5 },
    { date: '2026-01-07', notes: 'Revisión de afecciones hidrológicas. Modificación de planta BESS y referencias', projectCode: 'P-25-398', hours: 4 },
    { date: '2026-01-08', notes: 'Modificación de planta BESS y referencias', projectCode: 'P-25-398', hours: 6 },
    { date: '2026-01-08', notes: 'Obtención de kmz y modificación RBDA', projectCode: 'P-25-399', hours: 1.5 },
    { date: '2026-01-08', notes: 'Reunión de producción', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-08', notes: 'Búsqueda de referencia topografía para plano de perfil y planta', projectCode: 'P-25-358', hours: 0.5 },
    { date: '2026-01-09', notes: 'Modificación de planta BESS y referencias', projectCode: 'P-25-398', hours: 4 },
    { date: '2026-01-09', notes: 'Revisión de planos línea. Modificación de documentos', projectCode: 'P-25-399', hours: 3 },
    { date: '2026-01-12', notes: 'Modificación de planta BESS y referencias. Modificación de documentos agrupación 1.1', projectCode: 'P-25-398', hours: 8.5 },
    { date: '2026-01-13', notes: 'Modificación documentos CSEC + Línea. Duplicación de agrupaciones', projectCode: 'P-25-398', hours: 7 },
    { date: '2026-01-13', notes: 'Reunión de presentación del proyecto', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-13', notes: 'Obtención de referencia topográfica con elevaciones para perfil Civil y visualización de detalles', projectCode: 'P-25-358', hours: 0.5 },
    { date: '2026-01-13', notes: 'Organización de vacaciones con Andrea', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-14', notes: 'Duplicación de agrupaciones', projectCode: 'P-25-398', hours: 6.5 },
    { date: '2026-01-14', notes: 'Reunión anual personal', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-14', notes: 'Plano planta y perfil', projectCode: 'P-25-358', hours: 0.5 },
    { date: '2026-01-14', notes: 'Etransmit opciones línea', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-15', notes: 'Plano planta y perfil', projectCode: 'P-25-358', hours: 2 },
    { date: '2026-01-15', notes: 'Formación en Civil 3D para obtener perfil de la línea, edición de los mismos y montaje de presentaciones', projectCode: 'G-22-902', hours: 4 },
    { date: '2026-01-15', notes: 'Reunión seguimiento proyecto', projectCode: 'P-25-394', hours: 1 },
    { date: '2026-01-15', notes: 'Reunión informativa equipo civil con Chema y Ester sobre formación. Reunión de producción', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-16', notes: 'Plano planta y perfil', projectCode: 'P-25-358', hours: 3.5 },
    { date: '2026-01-16', notes: 'Pequeña reunión con Canga y Antonio para sobre formación. Organización vacaciones.', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-16', notes: 'Modificación red de drenaje y recogida de pluviales y actualización en Word SSAA', projectCode: 'P-25-394', hours: 0.5 },
    { date: '2026-01-16', notes: 'Formación en Civil 3D para obtener perfil de la línea, edición de los mismos y montaje de presentaciones', projectCode: 'G-22-902', hours: 2.5 },
    { date: '2026-01-19', notes: 'Plano planta y perfil', projectCode: 'P-25-358', hours: 2.5 },
    { date: '2026-01-19', notes: 'Reunión con Canga para organización cursos de formación. Organización de vacaciones departamento', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-19', notes: 'Curso de formación Civil 3D', projectCode: 'G-22-902', hours: 3.5 },
    { date: '2026-01-20', notes: 'Organización de vacaciones con Antonio Luis y Helga. Encaje final de todas. Reunión con Antonio sobre reunión del día anterior del proyecto Lantania', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-20', notes: 'Curso de formación Civil 3D', projectCode: 'G-22-902', hours: 3 },
    { date: '2026-01-20', notes: 'Organización con Ibarra y Juanlu para ver alcance de trabajo', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-20', notes: 'Reunión con el departamento para tratar el tema de la formación del equipo en los distintos softwares. Reunión con Chema sobre Cype. Reunión con Edgar sobre trabajo en Dragados', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-21', notes: 'Curso de formación Civil 3D', projectCode: 'G-22-902', hours: 2.5 },
    { date: '2026-01-21', notes: 'Revisión documentación recibida, búsqueda de información PGOU, referencia implantación', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-01-21', notes: 'Organización y resumen de vacaciones departamento', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-22', notes: 'Referencia planta BESS', projectCode: 'P-26-403', hours: 8.5 },
    { date: '2026-01-22', notes: 'Reunión producción', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-23', notes: 'Documentos y referencias BESS', projectCode: 'P-26-403', hours: 7 },
    { date: '2026-01-26', notes: 'Documentos y referencias BESS', projectCode: 'P-26-403', hours: 8.5 },
    { date: '2026-01-27', notes: 'Modificación implantación con retranqueo 20m desde linde parcela. Documentos y referencias BESS', projectCode: 'P-26-403', hours: 7.75 },
    { date: '2026-01-27', notes: 'Reunión responsables de departamentos con Chema y Ester', projectCode: 'G-21-901', hours: 0.75 },
    { date: '2026-01-28', notes: 'Documentos y referencias BESS. Proyecto de CSEC+Línea', projectCode: 'P-26-403', hours: 6 },
    { date: '2026-01-29', notes: 'Formato y presentaciones de perfiles del terreno', projectCode: 'P-25-298', hours: 2 },
    { date: '2026-01-29', notes: 'Revisión proyectos BESS Montes y planos de línea', projectCode: 'P-26-403', hours: 4 },
    { date: '2026-01-29', notes: 'Modificación implantación BESS con afecciones', projectCode: 'P-26-405', hours: 3 },
    { date: '2026-01-29', notes: 'Modificación implantación BESS con afecciones', projectCode: 'P-26-406', hours: 1.5 },
    { date: '2026-01-29', notes: 'Reunión de producción', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-30', notes: 'Referencias proyecto y producción documentación', projectCode: 'P-26-405', hours: 4.5 },
    { date: '2026-01-30', notes: 'Referencias proyecto y producción documentación', projectCode: 'P-26-406', hours: 2.5 },
    { date: '2026-02-02', notes: 'Referencias proyecto y producción documentación', projectCode: 'P-26-405', hours: 2 },
    { date: '2026-02-02', notes: 'PROYECTO VIVIENDAS ARQUITEK. Revisión de documentación recibida y reunión con Fran para explicación proyecto', projectCode: 'O-21-802', hours: 1.5 },
    { date: '2026-02-02', notes: 'PLANTA GENERAL SET+BESS MÁLAGA. Planta general con todas las SETs y plantas individuales de cada una', projectCode: 'P-26-406', hours: 4 },
    { date: '2026-02-02', notes: 'Curso de formación Civil 3D', projectCode: 'G-22-902', hours: 0.5 },
    { date: '2026-02-02', notes: 'Organización semanal del trabajo del departamento', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-02-03', notes: 'Producción de documentación', projectCode: 'P-26-405', hours: 4.5 },
    { date: '2026-02-03', notes: 'Producción de documentación', projectCode: 'P-26-406', hours: 4 },
    { date: '2026-02-04', notes: 'Producción de documentación', projectCode: 'P-26-405', hours: 4 },
    { date: '2026-02-04', notes: 'Producción de documentación', projectCode: 'P-26-406', hours: 4 },
    { date: '2026-02-04', notes: 'PROYECTO VIVIENDAS ARQUITEK. Preparación de referencias', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-02-05', notes: 'CITA MÉDICA', projectCode: 'G-22-903', hours: 2 },
    { date: '2026-02-05', notes: 'Producción de documentación', projectCode: 'P-26-405', hours: 2 },
    { date: '2026-02-05', notes: 'Producción de documentación', projectCode: 'P-26-406', hours: 2 },
    { date: '2026-02-05', notes: 'PROYECTO VIVIENDAS ARQUITEK. Preparación de referencias', projectCode: 'O-21-802', hours: 2 },
];

// Time entries for Andrea Ariza
const andreaEntries = [
    { date: '2026-01-02', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 7 },
    { date: '2026-01-05', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 8 },
    { date: '2026-01-07', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-08', notes: 'Adecuación y visualización de planos', projectCode: 'P-25-381', hours: 8.5 },
    { date: '2026-01-09', notes: 'Adecuación y visualización de planos', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-09', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 2 },
    { date: '2026-01-12', notes: 'Adecuación y visualización de planos', projectCode: 'P-25-381', hours: 7.5 },
    { date: '2026-01-12', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 1 },
    { date: '2026-01-13', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-14', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-15', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-16', notes: 'Formatos y Cajetines', projectCode: 'P-25-336', hours: 8.5 },
    { date: '2026-01-17', notes: 'Civil 3D', projectCode: 'G-22-902', hours: 7 },
    { date: '2026-01-19', notes: 'Proyecto Lantania', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-20', notes: 'Proyecto Lantania', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-01-21', notes: 'Proyecto Lantania', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-22', notes: 'Proyecto Lantania', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-01-23', notes: 'Proyecto Lantania', projectCode: 'P-26-401', hours: 7 },
    { date: '2026-01-26', notes: 'Modelado BIM de Tanques y Cimentaciones', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-01-27', notes: 'Modelado BIM de Tanques y Cimentaciones', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-01-28', notes: 'Modelado BIM de Tanques y Cimentaciones', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-01-29', notes: 'Modelado BIM de Tanques y Cimentaciones', projectCode: 'P-26-401', hours: 9 },
    { date: '2026-01-30', notes: 'Modelado BIM de Tanques y Cimentaciones', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-02', notes: 'Modelado BIM de Tanques y Cimentaciones', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-02-03', notes: 'Modelado de Cubierta', projectCode: 'P-26-401', hours: 9 },
    { date: '2026-02-04', notes: 'Modelado de Cubierta', projectCode: 'P-26-401', hours: 9 },
    { date: '2026-02-05', notes: 'Modelado de Cubierta', projectCode: 'P-26-401', hours: 9 },
];

// Time entries for Miguel Jiménez
const miguelJimenezEntries = [
    { date: '2026-01-02', notes: 'Vacaciones', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: 'Ofertas', projectCode: 'O-24-806', hours: 5.5 },
    { date: '2026-01-05', notes: 'Vacaciones', projectCode: 'G-22-903', hours: 2.5 },
    { date: '2026-01-07', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8 },
    { date: '2026-01-08', notes: 'Ofertas', projectCode: 'O-24-806', hours: 9.5 },
    { date: '2026-01-09', notes: 'Ofertas', projectCode: 'O-24-806', hours: 7 },
    { date: '2026-01-12', notes: 'Ofertas', projectCode: 'O-24-806', hours: 9 },
    { date: '2026-01-13', notes: 'Ofertas', projectCode: 'O-24-806', hours: 7 },
    { date: '2026-01-14', notes: '14 Apartamentos', projectCode: 'P-25-367', hours: 4 },
    { date: '2026-01-14', notes: 'Ofertas', projectCode: 'O-24-806', hours: 5.5 },
    { date: '2026-01-15', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8.5 },
    { date: '2026-01-16', notes: 'Ofertas', projectCode: 'O-24-806', hours: 7 },
    { date: '2026-01-19', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8.5 },
    { date: '2026-01-20', notes: 'Ofertas', projectCode: 'O-24-806', hours: 6 },
    { date: '2026-01-20', notes: 'Caixa Tejar', projectCode: 'P-25-314', hours: 2.5 },
    { date: '2026-01-21', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8 },
    { date: '2026-01-22', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8 },
    { date: '2026-01-23', notes: 'Ofertas', projectCode: 'O-24-806', hours: 7 },
    { date: '2026-01-26', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8.5 },
    { date: '2026-01-27', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8.5 },
    { date: '2026-01-28', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8 },
    { date: '2026-01-29', notes: 'Ofertas', projectCode: 'O-24-806', hours: 8 },
    { date: '2026-01-30', notes: 'Ofertas', projectCode: 'O-24-806', hours: 7 },
];

// Time entries for Helga Hernández
const helgaEntries = [
    { date: '2026-01-05', notes: 'finalización jornada por día de Reyes', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-08', notes: 'ausencia hospitalización familiar', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-13', notes: 'reunión anual', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-20', notes: 'reunión departamento', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-22', notes: 'formación CIVIL 3D', projectCode: 'G-22-902', hours: 2 },
    { date: '2026-01-23', notes: 'formación CIVIL 3D', projectCode: 'G-22-902', hours: 7 },
    { date: '2026-01-26', notes: 'formación CIVIL 3D', projectCode: 'G-22-902', hours: 3 },
    { date: '2026-01-27', notes: 'formación CIVIL 3D', projectCode: 'G-22-902', hours: 2 },
];

// Time entries for Antonio Calderón
const antonioEntries = [
    { date: '2026-01-02', notes: '', projectCode: 'G-22-903', hours: 8.25 },
    { date: '2026-01-05', notes: '', projectCode: 'G-22-903', hours: 8.25 },
    { date: '2026-01-07', notes: 'Modificado de planos', projectCode: 'P-25-374', hours: 8.25 },
    { date: '2026-01-08', notes: 'Modificado de planos', projectCode: 'P-25-374', hours: 8.25 },
    { date: '2026-01-09', notes: 'Modificado de planos', projectCode: 'P-25-374', hours: 7 },
    { date: '2026-01-12', notes: 'Modificado de planos', projectCode: 'P-25-374', hours: 8.25 },
    { date: '2026-01-13', notes: 'Modificado de planos', projectCode: 'P-25-374', hours: 8.25 },
    { date: '2026-01-14', notes: 'Modificado de planos', projectCode: 'P-25-374', hours: 8.25 },
    { date: '2026-01-15', notes: 'Estudio y creación de BEP', projectCode: 'G-21-901', hours: 8.25 },
    { date: '2026-01-16', notes: 'Estudio y creación de BEP', projectCode: 'G-21-901', hours: 7 },
    { date: '2026-01-19', notes: 'Reunión con Lantania', projectCode: 'O-21-802', hours: 8.25 },
    { date: '2026-01-20', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
    { date: '2026-01-21', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
    { date: '2026-01-22', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
    { date: '2026-01-23', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 7 },
    { date: '2026-01-26', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
    { date: '2026-01-27', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
    { date: '2026-01-28', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
    { date: '2026-01-29', notes: 'Coordinación de modelo 201', projectCode: 'P-26-401', hours: 8.25 },
];

// Time entries for Alfonso Mateos
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
    { date: '2026-01-12', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-12', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 4.5 },
    { date: '2026-01-12', notes: 'Revisión memoria Ambigú', projectCode: 'P-25-391', hours: 1.5 },
    { date: '2026-01-13', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-13', notes: 'Reunión Anual MEP', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-13', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-13', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 3 },
    { date: '2026-01-14', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-14', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-14', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-15', notes: 'Oferta IV', projectCode: 'O-21-802', hours: 0.5 },
    { date: '2026-01-15', notes: 'Reunión de producción semanal', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-15', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-15', notes: 'Documentación Proyectos Agua', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-15', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-15', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-15', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-16', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-16', notes: 'Info para formación IA', projectCode: 'G-22-902', hours: 5 },
    { date: '2026-01-19', notes: 'Reunión cliente', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-19', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-19', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-20', notes: 'Consultas CFD', projectCode: 'G-22-902', hours: 0.5 },
    { date: '2026-01-20', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 7 },
    { date: '2026-01-20', notes: 'Reunión CYMCAP', projectCode: 'G-22-902', hours: 1 },
    { date: '2026-01-21', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-21', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-21', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-21', notes: 'Consultas CFD', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-22', notes: 'Reunión de producción semanal', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-22', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-22', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 7 },
    { date: '2026-01-22', notes: 'Consultas CFD', projectCode: 'G-22-902', hours: 1 },
    { date: '2026-01-23', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 4 },
    { date: '2026-01-23', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-23', notes: 'Oferta IV', projectCode: 'O-21-802', hours: 3 },
    { date: '2026-01-26', notes: 'Consultas CFD', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-26', notes: 'Oferta IV', projectCode: 'O-21-802', hours: 0.5 },
    { date: '2026-01-26', notes: 'Canalizaciones eléctricas', projectCode: 'P-26-401', hours: 6.5 },
    { date: '2026-01-27', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-27', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 1.5 },
    { date: '2026-01-27', notes: 'Consultas CFD', projectCode: 'G-22-902', hours: 1 },
    { date: '2026-01-27', notes: 'Canalizaciones eléctricas', projectCode: 'P-26-401', hours: 5 },
    { date: '2026-01-28', notes: 'Reunión Dpto. ELE', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-28', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-28', notes: 'Oferta Elecam + IV', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-28', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-28', notes: 'Canalizaciones eléctricas', projectCode: 'P-26-401', hours: 5 },
    { date: '2026-01-29', notes: 'Reunión de producción semanal', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-29', notes: 'Correos/reunión/organización trabajos', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-29', notes: 'HV Cable Modelling Steady-State Thermal Study', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-29', notes: 'Consultas CFD', projectCode: 'G-22-902', hours: 2 },
    { date: '2026-01-29', notes: 'Canalizaciones eléctricas', projectCode: 'P-26-401', hours: 2 },
    { date: '2026-01-29', notes: 'Calculo solar', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-30', notes: 'MEP Canadá', projectCode: 'G-21-901', hours: 3.5 },
    { date: '2026-01-30', notes: 'Canalizaciones eléctricas', projectCode: 'P-26-401', hours: 3.5 },
    { date: '2026-01-30', notes: 'Actualización software pendiente', projectCode: 'G-21-901', hours: 1 },
];

// Time entries for Jose Manuel Bucarat
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
    { date: '2026-01-09', notes: '', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-398', hours: 1.5 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-381', hours: 3 },
    { date: '2026-01-12', notes: 'Reuniones', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-399', hours: 2 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-398', hours: 0.5 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-398', hours: 2 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-13', notes: 'Reuniones', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-374', hours: 2.5 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-14', notes: 'Reuniones', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-381', hours: 2.5 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-392', hours: 1 },
    { date: '2026-01-15', notes: 'Reuniones', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-398', hours: 1.5 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-316', hours: 1.5 },
    { date: '2026-01-16', notes: 'Reuniones', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-19', notes: 'Reuniones', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-19', notes: '', projectCode: 'P-25-381', hours: 2.5 },
    { date: '2026-01-19', notes: '', projectCode: 'P-24-252', hours: 1 },
    { date: '2026-01-19', notes: '', projectCode: 'P-25-398', hours: 1 },
    { date: '2026-01-19', notes: 'busqueda formación y software', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-374', hours: 0.5 },
    { date: '2026-01-20', notes: '', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-20', notes: '', projectCode: 'O-21-802', hours: 1.5 },
    { date: '2026-01-21', notes: '', projectCode: 'P-26-403', hours: 3 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-381', hours: 2.5 },
    { date: '2026-01-21', notes: '', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-22', notes: '', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-22', notes: '', projectCode: 'P-26-403', hours: 1.5 },
    { date: '2026-01-22', notes: '', projectCode: 'P-25-374', hours: 3 },
    { date: '2026-01-22', notes: '', projectCode: 'P-25-381', hours: 2.5 },
    { date: '2026-01-22', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-23', notes: '', projectCode: 'P-26-403', hours: 2 },
    { date: '2026-01-23', notes: '', projectCode: 'P-25-374', hours: 3 },
    { date: '2026-01-23', notes: '', projectCode: 'P-25-381', hours: 3.5 },
    { date: '2026-01-23', notes: '', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-26', notes: '', projectCode: 'G-21-901', hours: 3.5 },
    { date: '2026-01-26', notes: '', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-26', notes: '', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-26', notes: '', projectCode: 'P-26-405', hours: 1 },
    { date: '2026-01-26', notes: '', projectCode: 'P-26-406', hours: 1 },
    { date: '2026-01-27', notes: '', projectCode: 'O-21-802', hours: 2 },
    { date: '2026-01-27', notes: '', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-01-27', notes: '', projectCode: 'P-26-403', hours: 2 },
    { date: '2026-01-27', notes: '', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-28', notes: '', projectCode: 'O-21-802', hours: 2 },
    { date: '2026-01-28', notes: '', projectCode: 'P-25-374', hours: 3.5 },
    { date: '2026-01-28', notes: '', projectCode: 'P-26-403', hours: 2 },
    { date: '2026-01-28', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-29', notes: '', projectCode: 'P-26-406', hours: 2.5 },
    { date: '2026-01-29', notes: '', projectCode: 'P-25-374', hours: 3 },
    { date: '2026-01-29', notes: '', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-29', notes: '', projectCode: 'O-21-802', hours: 1 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-405', hours: 1.5 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-406', hours: 1.5 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-403', hours: 2 },
    { date: '2026-01-30', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-30', notes: '', projectCode: 'P-25-374', hours: 1 },
    { date: '2026-02-02', notes: '', projectCode: 'P-25-374', hours: 3.5 },
    { date: '2026-02-02', notes: '', projectCode: 'P-26-405', hours: 3 },
    { date: '2026-02-02', notes: '', projectCode: 'O-21-802', hours: 2 },
    { date: '2026-02-02', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-02-03', notes: 'EXPOSICIÓN IA VS SISTEMAS EN EL EOI', projectCode: 'G-21-901', hours: 6 },
    { date: '2026-02-03', notes: '', projectCode: 'P-25-374', hours: 2.5 },
    { date: '2026-02-04', notes: '', projectCode: 'O-21-802', hours: 2.5 },
];

// Time entries for Juan Luis Gavira
const juanLuisEntries = [
    { date: '2026-01-02', notes: '', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-399', hours: 5 },
    { date: '2026-01-05', notes: '', projectCode: 'P-24-271', hours: 1 },
    { date: '2026-01-05', notes: '', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-399', hours: 1 },
    { date: '2026-01-07', notes: '', projectCode: 'P-24-271', hours: 6 },
    { date: '2026-01-08', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-08', notes: '', projectCode: 'P-24-271', hours: 8 },
    { date: '2026-01-09', notes: '', projectCode: 'P-24-271', hours: 7 },
    { date: '2026-01-12', notes: '', projectCode: 'P-24-271', hours: 8 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-13', notes: '', projectCode: 'P-24-271', hours: 4 },
    { date: '2026-01-14', notes: '', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-298', hours: 6 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-15', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-15', notes: '', projectCode: 'P-24-271', hours: 4 },
    { date: '2026-01-16', notes: '', projectCode: 'P-24-271', hours: 6 },
    { date: '2026-01-16', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-19', notes: '', projectCode: 'P-24-271', hours: 8 },
    { date: '2026-01-20', notes: '', projectCode: 'P-24-271', hours: 4 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-21', notes: '', projectCode: 'P-24-271', hours: 4 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-22', notes: '', projectCode: 'P-24-271', hours: 8 },
    { date: '2026-01-22', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-23', notes: '', projectCode: 'P-24-271', hours: 7 },
    { date: '2026-01-26', notes: '', projectCode: 'P-26-403', hours: 8 },
    { date: '2026-01-27', notes: '', projectCode: 'P-26-403', hours: 4 },
    { date: '2026-01-27', notes: '', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-28', notes: '', projectCode: 'P-26-403', hours: 8 },
    { date: '2026-01-29', notes: '', projectCode: 'P-26-403', hours: 8 },
    { date: '2026-01-29', notes: '', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-405', hours: 4 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-406', hours: 3 },
    { date: '2026-02-02', notes: '', projectCode: 'P-26-405', hours: 8 },
    { date: '2026-02-03', notes: '', projectCode: 'P-26-405', hours: 5 },
    { date: '2026-02-03', notes: '', projectCode: 'P-26-406', hours: 4 },
    { date: '2026-02-04', notes: '', projectCode: 'P-26-405', hours: 8 },
    { date: '2026-02-05', notes: '', projectCode: 'P-26-406', hours: 4 },
    { date: '2026-02-05', notes: '', projectCode: 'P-26-405', hours: 4 },
    { date: '2026-02-06', notes: '', projectCode: 'P-26-406', hours: 3 },
    { date: '2026-02-06', notes: '', projectCode: 'P-26-405', hours: 3 },
    { date: '2026-02-06', notes: '', projectCode: 'G-21-901', hours: 1 },
];

// Time entries for Jose Calurano
const joseCaluranoEntries = [
    { date: '2026-01-02', notes: '', projectCode: 'P-25-358', hours: 5.5 },
    { date: '2026-01-02', notes: '', projectCode: 'P-25-306', hours: 1 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-358', hours: 5 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-306', hours: 0.5 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-381', hours: 0.5 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-306', hours: 7 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-306', hours: 6.5 },
    { date: '2026-01-08', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 1 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-381', hours: 0.5 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-306', hours: 6.5 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-306', hours: 3.25 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-381', hours: 6.25 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-392', hours: 2 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-381', hours: 5.5 },
    { date: '2026-01-13', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-381', hours: 3.25 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-392', hours: 5.25 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-381', hours: 4.25 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-392', hours: 1 },
    { date: '2026-01-15', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-380', hours: 2.5 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-19', notes: '', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-19', notes: '', projectCode: 'P-25-380', hours: 7.5 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-380', hours: 2 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-362', hours: 3.25 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-381', hours: 3.25 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-377', hours: 7 },
    { date: '2026-01-21', notes: '', projectCode: 'P-25-381', hours: 0.5 },
    { date: '2026-01-22', notes: '', projectCode: 'P-25-381', hours: 7 },
    { date: '2026-01-22', notes: '', projectCode: 'P-25-377', hours: 0.5 },
    { date: '2026-01-22', notes: '', projectCode: 'P-25-380', hours: 0.5 },
    { date: '2026-01-22', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-23', notes: '', projectCode: 'P-25-381', hours: 7 },
    { date: '2026-01-26', notes: '', projectCode: 'P-26-401', hours: 3 },
    { date: '2026-01-26', notes: '', projectCode: 'P-25-377', hours: 1 },
    { date: '2026-01-26', notes: '', projectCode: 'P-25-381', hours: 2.5 },
    { date: '2026-01-26', notes: 'Cursos de formación', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-27', notes: '', projectCode: 'P-25-381', hours: 3 },
    { date: '2026-01-27', notes: '', projectCode: 'P-26-401', hours: 6.75 },
    { date: '2026-01-28', notes: '', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-28', notes: '', projectCode: 'P-26-401', hours: 7 },
    { date: '2026-01-28', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-29', notes: '', projectCode: 'P-25-358', hours: 2 },
    { date: '2026-01-29', notes: '', projectCode: 'P-26-401', hours: 5 },
    { date: '2026-01-29', notes: '', projectCode: 'P-25-381', hours: 1.5 },
    { date: '2026-01-29', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-30', notes: '', projectCode: 'P-25-381', hours: 4.5 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-401', hours: 1 },
    { date: '2026-01-30', notes: '', projectCode: 'O-21-802', hours: 1.5 },
];

// Time entries for Miguel Chambilla
const miguelChambillaEntries = [
    { date: '2026-01-02', notes: '', projectCode: 'P-25-398', hours: 8 },
    { date: '2026-01-05', notes: '', projectCode: 'P-25-399', hours: 8 },
    { date: '2026-01-07', notes: '', projectCode: 'P-25-399', hours: 8 },
    { date: '2026-01-08', notes: '', projectCode: 'P-25-399', hours: 8 },
    { date: '2026-01-09', notes: '', projectCode: 'P-25-399', hours: 8 },
    { date: '2026-01-12', notes: '', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-13', notes: '', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-14', notes: '', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-15', notes: '', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-16', notes: '', projectCode: 'P-25-378', hours: 8 },
    { date: '2026-01-19', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-20', notes: '', projectCode: 'P-25-378', hours: 2 },
    { date: '2026-01-20', notes: '', projectCode: 'P-26-401', hours: 6 },
    { date: '2026-01-21', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-22', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-23', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-26', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-27', notes: '', projectCode: 'O-21-801', hours: 2 },
    { date: '2026-01-27', notes: '', projectCode: 'P-26-401', hours: 6 },
    { date: '2026-01-28', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-01-29', notes: '', projectCode: 'P-26-401', hours: 5 },
    { date: '2026-01-29', notes: 'Cursos de formación', projectCode: 'G-22-902', hours: 4 },
    { date: '2026-01-30', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-02', notes: '', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-03', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 5 },
    { date: '2026-02-03', notes: '', projectCode: 'P-26-401', hours: 3 },
    { date: '2026-02-04', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 8 },
    { date: '2026-02-05', notes: '', projectCode: 'P-25-378', hours: 4 },
    { date: '2026-02-05', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 4 },
    { date: '2026-02-06', notes: '', projectCode: 'O-21-801', hours: 5 },
    { date: '2026-02-06', notes: 'Mejoras y Organización', projectCode: 'G-21-901', hours: 3 },
];

// Time entries for Vicente Benitez
const vicenteBenitezEntries = [
    { date: '2026-01-02', notes: 'Memoria y planos', projectCode: 'P-25-381', hours: 6.5 },
    { date: '2026-01-05', notes: 'Simulaciones, memoria y planos', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-07', notes: 'Memoria', projectCode: 'P-25-381', hours: 8.25 },
    { date: '2026-01-08', notes: 'Memoria', projectCode: 'P-25-381', hours: 8.5 },
    { date: '2026-01-09', notes: 'memoria', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-09', notes: 'Reunión anual de seguimiento', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-12', notes: 'Reunión IV', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-12', notes: 'Memoria', projectCode: 'P-25-381', hours: 7.25 },
    { date: '2026-01-13', notes: 'Reunion ELIA e IV', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-13', notes: 'Simulación y memoria', projectCode: 'P-25-381', hours: 7.25 },
    { date: '2026-01-14', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 8.25 },
    { date: '2026-01-15', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 8.25 },
    { date: '2026-01-16', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-16', notes: 'Borrar logos, etc', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-19', notes: 'Borrar logos, etc', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-19', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 5.25 },
    { date: '2026-01-19', notes: 'Reunion IV', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-20', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 7.75 },
    { date: '2026-01-20', notes: 'Reunión CYMCAP - Transitorio con ATM', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-21', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 8.75 },
    { date: '2026-01-22', notes: 'Simulaciones transitorio', projectCode: 'P-25-381', hours: 9.5 },
    { date: '2026-01-23', notes: 'memoria', projectCode: 'P-25-381', hours: 7.5 },
    { date: '2026-01-26', notes: 'Memoria', projectCode: 'P-25-381', hours: 8 },
    { date: '2026-01-27', notes: 'Memoria', projectCode: 'P-25-381', hours: 3 },
    { date: '2026-01-27', notes: 'Cuantificación cables', projectCode: 'P-26-401', hours: 6.5 },
    { date: '2026-01-28', notes: 'Ruteados de cables e identificación', projectCode: 'P-26-401', hours: 9 },
    { date: '2026-01-29', notes: 'Ruteados de cables e identificación', projectCode: 'P-26-401', hours: 3 },
    { date: '2026-01-29', notes: 'Comentarios memoria', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-30', notes: 'Ruteados de cables e identificación - Edif201', projectCode: 'P-26-401', hours: 6.5 },
    { date: '2026-02-02', notes: 'Ruteados de cables e identificación - Edif201', projectCode: 'P-26-401', hours: 8.5 },
    { date: '2026-02-03', notes: 'Ruteados de cables e identificación - Edif201', projectCode: 'P-26-401', hours: 8 },
    { date: '2026-02-03', notes: 'Organizacion comentarios y reunion Rev01B', projectCode: 'P-25-381', hours: 0.5 },
    { date: '2026-02-04', notes: 'Cymcap y reunion IV', projectCode: 'P-25-381', hours: 1.5 },
    { date: '2026-02-04', notes: 'Ruteados de cables e identificación - Edif201', projectCode: 'P-26-401', hours: 7 },
    { date: '2026-02-05', notes: 'Reunion IV e comentarios', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-02-05', notes: 'Ruteados de cables e identificación - Edif201', projectCode: 'P-26-401', hours: 7.5 },
    { date: '2026-02-06', notes: 'Ruteados de cables e identificación - Edif201', projectCode: 'P-26-401', hours: 6.5 },
];

// Time entries for Jose Antonio Gil
const joseAntonioGilEntries = [
    { date: '2026-01-02', notes: 'simscale, cymcap', projectCode: 'P-25-381', hours: 11.5 },
    { date: '2026-01-05', notes: 'simscale, cymcap', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-01-07', notes: 'simscale', projectCode: 'G-21-901', hours: 2.5 },
    { date: '2026-01-07', notes: 'simscale', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-07', notes: 'oferta BESS', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-01-08', notes: 'simscale', projectCode: 'P-25-381', hours: 8.5 },
    { date: '2026-01-09', notes: 'Separata General', projectCode: 'P-25-399', hours: 2 },
    { date: '2026-01-09', notes: 'simscale', projectCode: 'P-25-381', hours: 3 },
    { date: '2026-01-09', notes: 'Reuniones simscale y Ansys', projectCode: 'G-21-901', hours: 1.5 },
    { date: '2026-01-12', notes: 'CFD', projectCode: 'P-25-381', hours: 8.5 },
    { date: '2026-01-12', notes: 'Reunión anual', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-13', notes: 'revision servicios afectados', projectCode: 'P-25-374', hours: 1 },
    { date: '2026-01-13', notes: 'curriculum', projectCode: 'G-24-904', hours: 0.5 },
    { date: '2026-01-13', notes: 'CFD', projectCode: 'P-25-381', hours: 6.5 },
    { date: '2026-01-14', notes: 'Reporte CFD', projectCode: 'P-25-381', hours: 8 },
    { date: '2026-01-15', notes: 'Reporte CFD', projectCode: 'P-25-381', hours: 11 },
    { date: '2026-01-16', notes: 'Simscale caso C', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-16', notes: 'PDF', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-16', notes: 'PDF', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-01-19', notes: 'Simscale + reunion', projectCode: 'P-25-381', hours: 9 },
    { date: '2026-01-20', notes: 'Simscale + reunion', projectCode: 'P-25-381', hours: 9.5 },
    { date: '2026-01-21', notes: 'Simscale Eletromagnetics', projectCode: 'P-25-381', hours: 9.5 },
    { date: '2026-01-22', notes: 'Simscale Eletromagnetics', projectCode: 'P-25-381', hours: 10.5 },
    { date: '2026-01-23', notes: 'Simscale', projectCode: 'P-25-381', hours: 6.5 },
    { date: '2026-01-26', notes: 'simscale', projectCode: 'P-25-381', hours: 9 },
    { date: '2026-01-27', notes: 'simscale', projectCode: 'P-25-381', hours: 7 },
    { date: '2026-01-27', notes: 'unifilar para ainstalaciones', projectCode: 'P-25-367', hours: 1.5 },
    { date: '2026-01-28', notes: 'simscale, telefonillo y reunión de vacaciones', projectCode: 'G-21-901', hours: 8 },
    { date: '2026-01-29', notes: 'simscale (excel)', projectCode: 'G-21-901', hours: 9.25 },
    { date: '2026-01-30', notes: 'simscale (excel)', projectCode: 'G-21-901', hours: 6.5 },
    { date: '2026-02-02', notes: 'SSAA yestado actual', projectCode: 'P-25-374', hours: 2.5 },
    { date: '2026-02-02', notes: 'simscale', projectCode: 'G-21-901', hours: 5.5 },
    { date: '2026-02-03', notes: 'mantenimiento sai, servidores y simscale', projectCode: 'G-21-901', hours: 2 },
    { date: '2026-02-03', notes: 'SSAA yestado actual', projectCode: 'P-25-374', hours: 4.5 },
    { date: '2026-02-03', notes: 'reunion y modelado nueva cuelver', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-02-04', notes: 'MAcro', projectCode: 'P-26-405', hours: 1.5 },
    { date: '2026-02-04', notes: 'Anexo Estado actual', projectCode: 'P-25-374', hours: 2 },
    { date: '2026-02-04', notes: 'simscale+reunion', projectCode: 'P-25-381', hours: 5.75 },
];

// Time entries for Teresa Thiriet
const teresaEntries = [
    { date: '2026-01-02', notes: 'Actualización trafos Digsilent y estudio de cortocircuito', projectCode: 'P-25-306', hours: 5 },
    { date: '2026-01-05', notes: '', projectCode: 'G-22-903', hours: 5 },
    { date: '2026-01-07', notes: 'Atualización Digsilent y memoria estudio de cortocircuito', projectCode: 'P-25-306', hours: 5.25 },
    { date: '2026-01-08', notes: 'Atualización Digsilent y memoria estudio de cortocircuito', projectCode: 'P-25-306', hours: 5 },
    { date: '2026-01-09', notes: 'Memorias estudio de cortocircuito Torozos 1, 2 y 3', projectCode: 'P-25-306', hours: 5 },
    { date: '2026-01-12', notes: 'Memorias estudio de cortocircuito Torozos 1, 2 y 3', projectCode: 'P-25-306', hours: 2.5 },
    { date: '2026-01-12', notes: 'formación excel', projectCode: 'G-22-902', hours: 1 },
    { date: '2026-01-12', notes: 'Organización documentos y formato', projectCode: 'P-24-271', hours: 1.5 },
    { date: '2026-01-13', notes: 'Memoria de cálculo eléctrico', projectCode: 'P-24-271', hours: 5 },
    { date: '2026-01-14', notes: 'Memoria de cálculo eléctrico y de cálculo mecánico', projectCode: 'P-24-271', hours: 3.5 },
    { date: '2026-01-14', notes: 'Modelado de zanja en CYMCAP', projectCode: 'P-25-333', hours: 1.5 },
    { date: '2026-01-15', notes: 'Modelado de zanja en CYMCAP', projectCode: 'P-25-333', hours: 5 },
    { date: '2026-01-16', notes: 'Modelado de zanja en CYMCAP', projectCode: 'P-25-333', hours: 1.5 },
    { date: '2026-01-16', notes: 'Reunión anual', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-16', notes: 'Memoria de cálculo eléctrico', projectCode: 'P-24-271', hours: 3 },
    { date: '2026-01-19', notes: 'Modelado de zanja en CYMCAP', projectCode: 'P-25-333', hours: 3.5 },
    { date: '2026-01-19', notes: 'Memoria de cálculo eléctrico', projectCode: 'P-24-271', hours: 1.5 },
    { date: '2026-01-20', notes: 'Memoria de cálculo eléctrico, cadena de aisladores', projectCode: 'P-24-271', hours: 5 },
    { date: '2026-01-21', notes: 'Formación DigSilent', projectCode: 'G-22-902', hours: 5 },
    { date: '2026-01-22', notes: 'Formación DigSilent', projectCode: 'G-22-902', hours: 0.5 },
    { date: '2026-01-22', notes: 'Actualización de macros y organización de carpetas PTAD SET MONTES', projectCode: 'P-26-403', hours: 4.5 },
    { date: '2026-01-23', notes: 'Actualización de macros y docuementos PTAD SET MONTES', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-01-26', notes: 'Actualización de macro y separata general', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-01-27', notes: 'Actuazlización de documentos, macros y separata', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-01-28', notes: 'Actualización de documentos', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-01-29', notes: 'Actualización de documentos', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-01-30', notes: 'Actualización y preparación de documentos', projectCode: 'P-26-403', hours: 5 },
    { date: '2026-02-02', notes: 'Actualización de macro y documentos', projectCode: 'P-26-405', hours: 3.5 },
    { date: '2026-02-02', notes: 'actualización de macros y documentos', projectCode: 'P-26-406', hours: 1.5 },
    { date: '2026-02-03', notes: 'actualización de macros y documentos', projectCode: 'P-26-405', hours: 5 },
    { date: '2026-02-04', notes: 'Actualización de documentos', projectCode: 'P-26-405', hours: 5 },
    { date: '2026-02-05', notes: 'Actualización de documentos', projectCode: 'P-26-405', hours: 5 },
    { date: '2026-02-06', notes: 'Actualización de documentos', projectCode: 'P-26-405', hours: 4.5 },
    { date: '2026-02-06', notes: 'Actualización de documentos', projectCode: 'P-26-406', hours: 0.5 },
];

// Time entries for Juan Antonio Ibarra
const juanAntonioIbarraEntries = [
    { date: '2026-01-02', notes: 'Vacaciones', projectCode: 'G-22-903', hours: 8 },
    { date: '2026-01-05', notes: 'Simulación cruce Nenufar-Betula cambiando resistividad. Revisión estudios pararrayos', projectCode: 'P-25-306', hours: 2 },
    { date: '2026-01-05', notes: 'Revisión avances de trabajos', projectCode: 'P-25-381', hours: 4 },
    { date: '2026-01-05', notes: 'Revisión de facturación pendiente', projectCode: 'P-25-377', hours: 2 },
    { date: '2026-01-07', notes: 'Actualización memoria pararrayos TOR I y II. Consulta SRA por cambio en CCTV', projectCode: 'P-25-306', hours: 2 },
    { date: '2026-01-07', notes: 'Reunión interna IV', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-07', notes: 'Revisión documentación proyecto', projectCode: 'P-25-391', hours: 4 },
    { date: '2026-01-08', notes: 'Redacción memoria', projectCode: 'P-25-391', hours: 8 },
    { date: '2026-01-09', notes: 'Llamada cliente duda zanja', projectCode: 'P-25-333', hours: 1.5 },
    { date: '2026-01-09', notes: 'nueva configuración + propuesta layout', projectCode: 'P-25-298', hours: 3.5 },
    { date: '2026-01-09', notes: 'Redacción memoria', projectCode: 'P-25-391', hours: 3 },
    { date: '2026-01-12', notes: 'Redacción memoria', projectCode: 'P-25-391', hours: 6 },
    { date: '2026-01-12', notes: 'Reunión con IV', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-12', notes: 'Reunión para gestión documental', projectCode: 'P-25-377', hours: 0.5 },
    { date: '2026-01-12', notes: 'Revisión oferta y documentos tipo según Alconchel', projectCode: 'P-25-298', hours: 0.5 },
    { date: '2026-01-13', notes: 'Redacción memoria', projectCode: 'P-25-391', hours: 2 },
    { date: '2026-01-13', notes: 'Reunión con IV-ELIA', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-13', notes: 'Gestión certificación', projectCode: 'P-25-377', hours: 1 },
    { date: '2026-01-13', notes: 'Reunión KOM e interna. Preparación gestión proyecto', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-14', notes: 'Reunión cliente para nueva simulación zanja cruzamiento. Expliación de trabajo', projectCode: 'P-25-333', hours: 2 },
    { date: '2026-01-14', notes: 'Revisión y envío acta reunión, organización carpeta y layout+espec. codificación.', projectCode: 'P-25-298', hours: 6 },
    { date: '2026-01-15', notes: 'Revisión y envío zanja cruce rambla', projectCode: 'P-25-333', hours: 3.5 },
    { date: '2026-01-15', notes: 'Revisión y envío documentos layout y codificación equipos. Formación junior diseño plantas fv', projectCode: 'P-25-298', hours: 4.5 },
    { date: '2026-01-16', notes: 'Revisión y envío alternativa zanja cruce ramba', projectCode: 'P-25-333', hours: 3 },
    { date: '2026-01-16', notes: 'Revisión y envío configuración eléctrica, plano de situación y emplazamiento. Recopilanción inputs pendientes', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-01-19', notes: 'Reunión IV', projectCode: 'P-25-381', hours: 1.5 },
    { date: '2026-01-19', notes: 'Revisión alternativa 2 zanja cruce rambla', projectCode: 'P-25-333', hours: 0.5 },
    { date: '2026-01-19', notes: 'Revisión y envío de descripción tecnica de proyecto. Explicación cálculos BT y MT a compañeros y preparación hoja de certificaciones.', projectCode: 'P-25-298', hours: 6 },
    { date: '2026-02-06', notes: 'modificación memoria incluyendo todos los comentarios', projectCode: 'P-25-374', hours: 8 },
    { date: '2026-01-20', notes: 'Revisión comentarios IRON, llamada cliente para comentarlos', projectCode: 'P-25-377', hours: 2 },
    { date: '2026-01-20', notes: 'Reunión CYMCAP e interna IV', projectCode: 'P-25-381', hours: 2 },
    { date: '2026-01-20', notes: 'Explicación rutados de BT, MT y Canalizaciones. Ajuste MDL y revisión correo contadores', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-21', notes: 'Revisión IRON actualizado y envío de documentación', projectCode: 'P-25-377', hours: 2 },
    { date: '2026-01-21', notes: 'Reunión cliente para ajuste final MDL, revisión hoja de centro de Selma. Reunión cliente seguimiento', projectCode: 'P-25-298', hours: 6 },
    { date: '2026-01-22', notes: 'Revisión SET actualizado y envío de documentación', projectCode: 'P-25-377', hours: 1 },
    { date: '2026-01-22', notes: 'Reunión cliente afecciones ambientales, revisión planos rutado bt y mt. revisión y cambio cálculo mt', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-22', notes: 'reunión interna IV', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-01-23', notes: 'casos 2 y 4 iv transcient state', projectCode: 'P-25-381', hours: 6 },
    { date: '2026-01-23', notes: 'revisión y envío calculos bt y ajuste certificación', projectCode: 'P-25-298', hours: 3 },
    { date: '2026-01-26', notes: 'Explicación criterios diseño FV', projectCode: 'G-22-902', hours: 3 },
    { date: '2026-01-26', notes: 'Reunión cliente para cambio de layout y comentario de centro seccionamiento. Revisión de plano de inversores y layout de inversores para envío', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-26', notes: 'reunión cliente ajuste frecuencia relé', projectCode: 'P-25-377', hours: 1 },
    { date: '2026-01-27', notes: 'Alternativa 4 a zanja de cruce rambla', projectCode: 'P-25-333', hours: 0.5 },
    { date: '2026-01-27', notes: 'Revisión de carta endesa y equipo selma para determinar celdas. Reunión cliente para ver layout tras cambio. Revisión y envío nuevo layout y configuración', projectCode: 'P-25-298', hours: 4 },
    { date: '2026-01-27', notes: 'expliación layout de zanjas bt, mt y cymcap para contrastar', projectCode: 'G-24-905', hours: 3.5 },
    { date: '2026-01-28', notes: 'Envío nueva revisión cálculo BT-CC. Ajuste planos con nuevos layouut', projectCode: 'P-25-298', hours: 8 },
    { date: '2026-01-29', notes: 'Revisión y entrega plano de rutados.', projectCode: 'P-25-298', hours: 8 },
    { date: '2026-01-30', notes: 'envío listado cables (MT, BTCC y BTAC), layout topográfico y de vallado y accesos', projectCode: 'P-25-298', hours: 6.5 },
    { date: '2026-01-30', notes: 'revisión modulos/string maetel entre métodos', projectCode: 'O-21-802', hours: 1.5 },
    { date: '2026-02-02', notes: 'envío justificación métodos sandia vs eduardo lorenzo', projectCode: 'O-21-802', hours: 3.5 },
    { date: '2026-02-02', notes: 'Entrega actualizada listado de cables, reunión para explicación detalle rutados y cambio vallado y accesos', projectCode: 'P-25-298', hours: 4.5 },
    { date: '2026-02-03', notes: 'ajuste mdl, envío layout vallado y accesos, rutados de BT. reunión cambio módulo', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-02-03', notes: 'Ajuste excel para cálculo mod/string y configuraciones', projectCode: 'G-21-901', hours: 3 },
    { date: '2026-02-04', notes: 'cruzamientos culverts según correo IV. Reunión cliente', projectCode: 'P-25-381', hours: 5 },
    { date: '2026-02-04', notes: 'Reunión cliente para ajuste estudio', projectCode: 'P-25-377', hours: 2 },
    { date: '2026-02-05', notes: 'actualización estudios coordinación protecciones tres plantas', projectCode: 'P-25-306', hours: 1 },
    { date: '2026-02-05', notes: 'reunión interna IV', projectCode: 'P-25-381', hours: 1 },
    { date: '2026-02-05', notes: 'aplicación comentarios', projectCode: 'P-25-374', hours: 6 },
];

// Time entries for Maica Sánchez
const maicaEntries = [
    { date: '2026-01-02', notes: 'VACACIONES', projectCode: 'G-22-903', hours: 5 },
    { date: '2026-01-05', notes: 'Proyecto de ejecucción para red (Editar formato)', projectCode: 'P-24-271', hours: 5 },
    { date: '2026-01-07', notes: 'Proyecto de ejecucción para red (Editar formato)', projectCode: 'P-24-271', hours: 5.5 },
    { date: '2026-01-08', notes: 'Proyecto de ejecucción para red (Editar formato)', projectCode: 'P-24-271', hours: 5.5 },
    { date: '2026-01-09', notes: 'Proyecto de ejecucción para red (Editar formato y aplicar comentarios)', projectCode: 'P-24-271', hours: 5.75 },
    { date: '2026-01-13', notes: 'Proyecto ejecución para red', projectCode: 'P-24-271', hours: 6 },
    { date: '2026-01-14', notes: 'Proyecto ejecución para red', projectCode: 'P-24-271', hours: 1 },
    { date: '2026-01-14', notes: 'Documento codificación', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-14', notes: 'Reuniones, documento memoria y Ordenar y codificar carpetas', projectCode: 'P-25-298', hours: 2.5 },
    { date: '2026-01-15', notes: 'Reunión anual', projectCode: 'G-21-901', hours: 0.5 },
    { date: '2026-01-15', notes: 'Memoria electrica', projectCode: 'P-25-298', hours: 4.75 },
    { date: '2026-01-16', notes: 'Descripcion tecnica del proyecto', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-01-19', notes: 'Cálculo cable LV + comentarios', projectCode: 'P-25-298', hours: 5.5 },
    { date: '2026-01-20', notes: 'Cálculo cable LV + excel', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-01-21', notes: 'Cálculo cable LV + excel', projectCode: 'P-25-298', hours: 6 },
    { date: '2026-01-22', notes: 'Cálculo cable BT + excel + orden de carpetas', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-01-23', notes: 'Revisión de todos los documentos que había que entregar ademas de correciones varias.', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-01-26', notes: 'Esquema unifilares y macro', projectCode: 'P-26-403', hours: 4.5 },
    { date: '2026-01-26', notes: 'Reunion y lista cables', projectCode: 'P-25-298', hours: 1 },
    { date: '2026-01-27', notes: 'Formación', projectCode: 'G-22-902', hours: 1.5 },
    { date: '2026-01-27', notes: 'Unifilares y macro', projectCode: 'P-26-403', hours: 1.5 },
    { date: '2026-01-27', notes: 'Modificación por cambio de layout', projectCode: 'P-25-298', hours: 2 },
    { date: '2026-01-28', notes: 'Zanjas en cymcap', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-01-29', notes: 'Formación PVSyst', projectCode: 'G-22-902', hours: 1 },
    { date: '2026-01-29', notes: 'Memoria pvsyst', projectCode: 'P-25-298', hours: 2.5 },
    { date: '2026-01-29', notes: 'Listas BT-AC y MT', projectCode: 'P-25-298', hours: 1.5 },
    { date: '2026-01-30', notes: 'Cymcap, listas', projectCode: 'P-25-298', hours: 5 },
    { date: '2026-02-02', notes: 'Revision listas/REBT/CYMCAP', projectCode: 'P-25-298', hours: 3.5 },
    { date: '2026-02-02', notes: 'Macro', projectCode: 'P-26-406', hours: 1.5 },
    { date: '2026-02-03', notes: 'Macro', projectCode: 'P-26-406', hours: 5 },
    { date: '2026-02-04', notes: 'Macro', projectCode: 'P-26-405', hours: 5 },
    { date: '2026-02-05', notes: 'Médico', projectCode: 'G-22-903', hours: 0.75 },
    { date: '2026-02-05', notes: 'Macro/documentos/planos', projectCode: 'P-26-406', hours: 4.25 },
    { date: '2026-02-06', notes: 'Macro/documentos (CAMBIOS)', projectCode: 'P-26-406', hours: 2.5 },
    { date: '2026-02-06', notes: 'Macro/documentos (CAMBIOS)', projectCode: 'P-26-405', hours: 2.5 },
];

async function main() {
    console.log('🌱 Seeding real time entries...\n');

    // Get company
    const company = await prisma.company.findFirst({ where: { slug: 'mep-projects' } });
    if (!company) throw new Error('Company not found. Run seed-users.ts first.');

    // Get users by email pattern
    const ester = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Ester', mode: 'insensitive' } },
                { email: { contains: 'ester', mode: 'insensitive' } }
            ]
        }
    });

    const javier = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Javier', mode: 'insensitive' } },
                { email: { contains: 'javier.jimenez', mode: 'insensitive' } }
            ]
        }
    });

    const jessica = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Jessica', mode: 'insensitive' } },
                { email: { contains: 'jessica', mode: 'insensitive' } }
            ]
        }
    });

    const marina = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Marina', mode: 'insensitive' } },
                { email: { contains: 'marina', mode: 'insensitive' } }
            ]
        }
    });

    const juanPablo = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Juan Pablo', mode: 'insensitive' } },
                { name: { contains: 'JuanPablo', mode: 'insensitive' } },
                { email: { contains: 'juanpablo', mode: 'insensitive' } }
            ]
        }
    });

    const joseManuelCanga = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'José Manuel Canga', mode: 'insensitive' } },
                { name: { contains: 'Jose Manuel Canga', mode: 'insensitive' } },
                { email: { contains: 'josemanuel.canga', mode: 'insensitive' } },
                { email: { contains: 'josemanuelc', mode: 'insensitive' } }
            ]
        }
    });

    const edgar = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Edgar', mode: 'insensitive' } },
                { email: { contains: 'edgar', mode: 'insensitive' } }
            ]
        }
    });

    const lorena = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Lorena', mode: 'insensitive' } },
                { email: { contains: 'lorena', mode: 'insensitive' } }
            ]
        }
    });

    const mayte = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Mayte', mode: 'insensitive' } },
                { email: { contains: 'mayte', mode: 'insensitive' } }
            ]
        }
    });

    const andrea = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Andrea', mode: 'insensitive' } },
                { email: { contains: 'andrea', mode: 'insensitive' } }
            ]
        }
    });

    const miguelJimenez = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Miguel', mode: 'insensitive' } },
                { email: { contains: 'miguel.jimenez', mode: 'insensitive' } },
                { email: { contains: 'miguelj', mode: 'insensitive' } }
            ]
        }
    });

    const helga = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Helga', mode: 'insensitive' } },
                { email: { contains: 'helga', mode: 'insensitive' } }
            ]
        }
    });

    const antonioCalderon = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Antonio Calderón', mode: 'insensitive' } },
                { name: { contains: 'Antonio Calderon', mode: 'insensitive' } },
                { email: { contains: 'antonio.calderon', mode: 'insensitive' } },
                { email: { contains: 'antonioc', mode: 'insensitive' } }
            ]
        }
    });

    const alfonso = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Alfonso', mode: 'insensitive' } },
                { email: { contains: 'alfonso', mode: 'insensitive' } }
            ]
        }
    });

    const joseManuelBucarat = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Jose Manuel Bucarat', mode: 'insensitive' } },
                { name: { contains: 'Jose Manuel Bucarat', mode: 'insensitive' } },
                { email: { contains: 'bucarat', mode: 'insensitive' } },
                { email: { contains: 'josemanuelb', mode: 'insensitive' } }
            ]
        }
    });

    const juanLuis = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Juan Luis', mode: 'insensitive' } },
                { email: { contains: 'juanluis', mode: 'insensitive' } },
                { email: { contains: 'juanlu', mode: 'insensitive' } }
            ]
        }
    });

    const joseCalurano = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Jose Calurano', mode: 'insensitive' } },
                { email: { contains: 'jose.calurano', mode: 'insensitive' } },
                { email: { contains: 'josec', mode: 'insensitive' } }
            ]
        }
    });

    const miguelChambilla = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Miguel Chambilla', mode: 'insensitive' } },
                { email: { contains: 'miguel.chambilla', mode: 'insensitive' } },
                { email: { contains: 'miguelc', mode: 'insensitive' } }
            ]
        }
    });

    const vicenteBenitez = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Vicente Benitez', mode: 'insensitive' } },
                { email: { contains: 'vicente.benitez', mode: 'insensitive' } },
                { email: { contains: 'vicenteb', mode: 'insensitive' } }
            ]
        }
    });

    const joseAntonioGil = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Antonio Gil', mode: 'insensitive' } },
                { email: { contains: 'joseantonio.gil', mode: 'insensitive' } },
                { email: { contains: 'joseantoniog', mode: 'insensitive' } },
                { email: { contains: 'jantoniog', mode: 'insensitive' } }
            ]
        }
    });

    const teresa = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Teresa', mode: 'insensitive' } },
                { email: { contains: 'teresa', mode: 'insensitive' } }
            ]
        }
    });

    const juanAntonioIbarra = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Juan Antonio Ibarra', mode: 'insensitive' } },
                { email: { contains: 'juanantonio.ibarra', mode: 'insensitive' } },
                { email: { contains: 'juanantonioi', mode: 'insensitive' } }
            ]
        }
    });

    const maica = await prisma.user.findFirst({
        where: {
            companyId: company.id,
            OR: [
                { name: { contains: 'Maica', mode: 'insensitive' } },
                { email: { contains: 'maica', mode: 'insensitive' } }
            ]
        }
    });

    // Clean old time entries
    console.log('🗑️ Cleaning old time entries...');
    await prisma.timeEntry.deleteMany();
    console.log('✅ Old time entries cleaned\n');

    // Get all projects for lookup
    const projects = await prisma.project.findMany({ where: { companyId: company.id } });
    const projectMap = new Map(projects.map(p => [p.code, p.id]));

    let created = 0;
    let skipped = 0;

    // Seed Ester's entries
    if (ester) {
        console.log(`👤 Seeding entries for ${ester.name || ester.email}...`);
        for (const entry of esterEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: ester.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${esterEntries.length} entries for Ester`);
    } else {
        console.log('⚠️ User Ester not found');
    }

    // Seed Javier's entries
    if (javier) {
        console.log(`👤 Seeding entries for ${javier.name || javier.email}...`);
        for (const entry of javierEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: javier.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${javierEntries.length} entries for Javier`);
    } else {
        console.log('⚠️ User Javier not found');
    }

    // Seed Jessica's entries
    if (jessica) {
        console.log(`👤 Seeding entries for ${jessica.name || jessica.email}...`);
        for (const entry of jessicaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: jessica.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${jessicaEntries.length} entries for Jessica`);
    } else {
        console.log('⚠️ User Jessica not found');
    }

    // Seed Marina's entries
    if (marina) {
        console.log(`👤 Seeding entries for ${marina.name || marina.email}...`);
        for (const entry of marinaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: marina.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${marinaEntries.length} entries for Marina`);
    } else {
        console.log('⚠️ User Marina not found');
    }

    // Seed Juan Pablo's entries
    if (juanPablo) {
        console.log(`👤 Seeding entries for ${juanPablo.name || juanPablo.email}...`);
        for (const entry of juanPabloEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: juanPablo.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${juanPabloEntries.length} entries for Juan Pablo`);
    } else {
        console.log('⚠️ User Juan Pablo not found');
    }

    // Seed José Manuel Canga's entries
    if (joseManuelCanga) {
        console.log(`👤 Seeding entries for ${joseManuelCanga.name || joseManuelCanga.email}...`);
        for (const entry of joseManuelEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: joseManuelCanga.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${joseManuelEntries.length} entries for José Manuel Canga`);
    } else {
        console.log('⚠️ User José Manuel Canga not found');
    }

    // Seed Edgar's entries
    if (edgar) {
        console.log(`👤 Seeding entries for ${edgar.name || edgar.email}...`);
        for (const entry of edgarEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: edgar.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${edgarEntries.length} entries for Edgar`);
    } else {
        console.log('⚠️ User Edgar not found');
    }

    // Seed Lorena's entries
    if (lorena) {
        console.log(`👤 Seeding entries for ${lorena.name || lorena.email}...`);
        for (const entry of lorenaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: lorena.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${lorenaEntries.length} entries for Lorena`);
    } else {
        console.log('⚠️ User Lorena not found');
    }

    // Seed Mayte's entries
    if (mayte) {
        console.log(`👤 Seeding entries for ${mayte.name || mayte.email}...`);
        for (const entry of mayteEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: mayte.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${mayteEntries.length} entries for Mayte`);
    } else {
        console.log('⚠️ User Mayte not found');
    }

    // Seed Andrea's entries
    if (andrea) {
        console.log(`👤 Seeding entries for ${andrea.name || andrea.email}...`);
        for (const entry of andreaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: andrea.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${andreaEntries.length} entries for Andrea`);
    } else {
        console.log('⚠️ User Andrea not found');
    }

    // Seed Miguel Jiménez's entries
    if (miguelJimenez) {
        console.log(`👤 Seeding entries for ${miguelJimenez.name || miguelJimenez.email}...`);
        for (const entry of miguelJimenezEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: miguelJimenez.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${miguelJimenezEntries.length} entries for Miguel Jiménez`);
    } else {
        console.log('⚠️ User Miguel Jiménez not found');
    }

    // Seed Helga's entries
    if (helga) {
        console.log(`👤 Seeding entries for ${helga.name || helga.email}...`);
        for (const entry of helgaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: helga.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${helgaEntries.length} entries for Helga`);
    } else {
        console.log('⚠️ User Helga not found');
    }

    // Seed Antonio Calderón's entries
    if (antonioCalderon) {
        console.log(`👤 Seeding entries for ${antonioCalderon.name || antonioCalderon.email}...`);
        for (const entry of antonioEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: antonioCalderon.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${antonioEntries.length} entries for Antonio Calderón`);
    } else {
        console.log('⚠️ User Antonio Calderón not found');
    }

    // Seed Alfonso's entries
    if (alfonso) {
        console.log(`👤 Seeding entries for ${alfonso.name || alfonso.email}...`);
        for (const entry of alfonsoEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: alfonso.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${alfonsoEntries.length} entries for Alfonso`);
    } else {
        console.log('⚠️ User Alfonso not found');
    }

    // Seed Jose Manuel Bucarat's entries
    if (joseManuelBucarat) {
        console.log(`👤 Seeding entries for ${joseManuelBucarat.name || joseManuelBucarat.email}...`);
        for (const entry of joseManuelBucaratEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: joseManuelBucarat.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${joseManuelBucaratEntries.length} entries for Jose Manuel Bucarat`);
    } else {
        console.log('⚠️ User Jose Manuel Bucarat not found');
    }

    // Seed Juan Luis's entries
    if (juanLuis) {
        console.log(`👤 Seeding entries for ${juanLuis.name || juanLuis.email}...`);
        for (const entry of juanLuisEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: juanLuis.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${juanLuisEntries.length} entries for Juan Luis`);
    } else {
        console.log('⚠️ User Juan Luis not found');
    }

    // Seed Jose Calurano's entries
    if (joseCalurano) {
        console.log(`👤 Seeding entries for ${joseCalurano.name || joseCalurano.email}...`);
        for (const entry of joseCaluranoEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: joseCalurano.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${joseCaluranoEntries.length} entries for Jose Calurano`);
    } else {
        console.log('⚠️ User Jose Calurano not found');
    }

    // Seed Miguel Chambilla's entries
    if (miguelChambilla) {
        console.log(`👤 Seeding entries for ${miguelChambilla.name || miguelChambilla.email}...`);
        for (const entry of miguelChambillaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: miguelChambilla.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${miguelChambillaEntries.length} entries for Miguel Chambilla`);
    } else {
        console.log('⚠️ User Miguel Chambilla not found');
    }

    // Seed Vicente Benitez's entries
    if (vicenteBenitez) {
        console.log(`👤 Seeding entries for ${vicenteBenitez.name || vicenteBenitez.email}...`);
        for (const entry of vicenteBenitezEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: vicenteBenitez.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${vicenteBenitezEntries.length} entries for Vicente Benitez`);
    } else {
        console.log('⚠️ User Vicente Benitez not found');
    }

    // Seed Jose Antonio Gil's entries
    if (joseAntonioGil) {
        console.log(`👤 Seeding entries for ${joseAntonioGil.name || joseAntonioGil.email}...`);
        for (const entry of joseAntonioGilEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: joseAntonioGil.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${joseAntonioGilEntries.length} entries for Jose Antonio Gil`);
    } else {
        console.log('⚠️ User Jose Antonio Gil not found');
    }

    // Seed Teresa's entries
    if (teresa) {
        console.log(`👤 Seeding entries for ${teresa.name || teresa.email}...`);
        for (const entry of teresaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: teresa.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${teresaEntries.length} entries for Teresa`);
    } else {
        console.log('⚠️ User Teresa not found');
    }

    // Seed Juan Antonio Ibarra's entries
    if (juanAntonioIbarra) {
        console.log(`👤 Seeding entries for ${juanAntonioIbarra.name || juanAntonioIbarra.email}...`);
        for (const entry of juanAntonioIbarraEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: juanAntonioIbarra.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${juanAntonioIbarraEntries.length} entries for Juan Antonio Ibarra`);
    } else {
        console.log('⚠️ User Juan Antonio Ibarra not found');
    }

    // Seed Maica's entries
    if (maica) {
        console.log(`👤 Seeding entries for ${maica.name || maica.email}...`);
        for (const entry of maicaEntries) {
            const projectId = projectMap.get(entry.projectCode);
            if (!projectId) {
                console.log(`⚠️ Project not found: ${entry.projectCode}`);
                skipped++;
                continue;
            }
            await prisma.timeEntry.create({
                data: {
                    date: new Date(entry.date),
                    hours: entry.hours,
                    notes: entry.notes,
                    status: 'APPROVED',
                    userId: maica.id,
                    projectId: projectId,
                }
            });
            created++;
        }
        console.log(`✅ ${maicaEntries.length} entries for Maica`);
    } else {
        console.log('⚠️ User Maica not found');
    }

    console.log(`\n✅ Total: ${created} time entries created, ${skipped} skipped`);
}

main()
    .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
