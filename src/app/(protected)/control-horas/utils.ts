/**
 * Control de Horas - Utilidades de Cálculo
 * 
 * Funciones puras para calcular días laborables, horas previstas, etc.
 * NO dependen de Prisma ni de auth - pueden ser testeadas unitariamente.
 */

// Colores por departamento (coherentes con el diseño del sistema)
export const DEPARTMENT_COLORS: Record<string, string> = {
    CIVIL_DESIGN: '#2563eb',      // blue-600
    ELECTRICAL: '#dc2626',        // red-600
    INSTRUMENTATION: '#16a34a',   // green-600
    ADMINISTRATION: '#9333ea',    // purple-600
    IT: '#0891b2',                // cyan-600
    ECONOMIC: '#ca8a04',          // yellow-600
    MARKETING: '#db2777',         // pink-600
    OTHER: '#6b7280'              // gray-500
};

export const DEPARTMENT_LABELS: Record<string, string> = {
    CIVIL_DESIGN: 'Diseño y Civil',
    ELECTRICAL: 'Eléctrico',
    INSTRUMENTATION: 'Instrumentación',
    ADMINISTRATION: 'Administración',
    IT: 'Informática',
    ECONOMIC: 'Económico',
    MARKETING: 'Marketing',
    OTHER: 'Otros'
};

// Días de la semana en español
export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_SEMANA_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Meses en español
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Festivos nacionales de España (año genérico, se ajustarán al año específico)
 * Estos son festivos nacionales fijos. Los autonómicos/locales se añadirían en settings.
 */
export const FESTIVOS_NACIONALES = [
    { mes: 0, dia: 1, nombre: 'Año Nuevo' },
    { mes: 0, dia: 6, nombre: 'Epifanía del Señor' },
    { mes: 4, dia: 1, nombre: 'Día del Trabajo' },
    { mes: 7, dia: 15, nombre: 'Asunción de la Virgen' },
    { mes: 9, dia: 12, nombre: 'Fiesta Nacional de España' },
    { mes: 10, dia: 1, nombre: 'Todos los Santos' },
    { mes: 11, dia: 6, nombre: 'Día de la Constitución' },
    { mes: 11, dia: 8, nombre: 'Inmaculada Concepción' },
    { mes: 11, dia: 25, nombre: 'Navidad' },
];

/**
 * Verifica si una fecha es fin de semana (sábado o domingo)
 */
export function esFinDeSemana(fecha: Date): boolean {
    const dia = fecha.getDay();
    return dia === 0 || dia === 6;
}

/**
 * Verifica si una fecha es festivo
 */
export function esFestivo(fecha: Date, festivosExtra: Date[] = []): boolean {
    const año = fecha.getFullYear();
    const mes = fecha.getMonth();
    const dia = fecha.getDate();

    // Verificar festivos nacionales
    const esFestivoNacional = FESTIVOS_NACIONALES.some(
        f => f.mes === mes && f.dia === dia
    );
    if (esFestivoNacional) return true;

    // Verificar festivos extra (configurados por empresa)
    return festivosExtra.some(f =>
        f.getFullYear() === año &&
        f.getMonth() === mes &&
        f.getDate() === dia
    );
}

/**
 * Verifica si una fecha es laborable (no es fin de semana ni festivo)
 */
export function esLaborable(fecha: Date, festivosExtra: Date[] = []): boolean {
    return !esFinDeSemana(fecha) && !esFestivo(fecha, festivosExtra);
}

/**
 * Obtiene todos los días de un mes como array de objetos
 */
export function getDiasDelMes(año: number, mes: number, festivosExtra: Date[] = []): DiaInfo[] {
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const dias: DiaInfo[] = [];

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fecha = new Date(año, mes, dia);
        dias.push({
            fecha,
            dia,
            diaSemana: fecha.getDay(),
            diaSemanaLabel: DIAS_SEMANA[fecha.getDay()],
            esFinDeSemana: esFinDeSemana(fecha),
            esFestivo: esFestivo(fecha, festivosExtra),
            esLaborable: esLaborable(fecha, festivosExtra),
        });
    }

    return dias;
}

/**
 * Cuenta los días laborables en un mes completo
 */
export function getDiasLaborablesMes(año: number, mes: number, festivosExtra: Date[] = []): number {
    const dias = getDiasDelMes(año, mes, festivosExtra);
    return dias.filter(d => d.esLaborable).length;
}

/**
 * Cuenta los días laborables hasta una fecha específica (inclusive)
 * Útil para calcular días laborables "hasta hoy" en el mes actual
 */
export function getDiasLaborablesHastaFecha(
    año: number,
    mes: number,
    hastaFecha: Date,
    festivosExtra: Date[] = []
): number {
    const dias = getDiasDelMes(año, mes, festivosExtra);
    return dias.filter(d =>
        d.esLaborable && d.fecha <= hastaFecha
    ).length;
}

/**
 * Calcula horas previstas basado en días laborables y jornada
 */
export function calcularHorasPrevistas(diasLaborables: number, jornadaDiaria: number = 8): number {
    return Math.round((diasLaborables * jornadaDiaria) * 10) / 10;
}

/**
 * Calcula la diferencia entre horas reales y previstas
 */
export function calcularDiferencia(horasReales: number, horasPrevistas: number): number {
    return Math.round((horasReales - horasPrevistas) * 10) / 10;
}

/**
 * Calcula el porcentaje de cumplimiento
 */
export function calcularPorcentaje(horasReales: number, horasPrevistas: number): number {
    if (horasPrevistas === 0) return 0;
    return Math.round((horasReales / horasPrevistas) * 100);
}

/**
 * Determina el estado de un día según las horas registradas
 */
export function getEstadoDia(
    horasTotales: number,
    esLaborable: boolean,
    jornadaDiaria: number = 8,
    esAusencia: boolean = false
): EstadoDia {
    if (esAusencia) return 'ausencia';
    if (!esLaborable) return 'no_laborable';
    if (horasTotales === 0) return 'vacio';
    if (horasTotales < jornadaDiaria) return 'incompleto';
    return 'completo';
}

/**
 * Obtiene el color CSS para el estado de un día
 */
export function getColorEstadoDia(estado: EstadoDia): string {
    switch (estado) {
        case 'completo': return 'bg-green-100 dark:bg-green-900/30';
        case 'incompleto': return 'bg-amber-100 dark:bg-amber-900/30';
        case 'vacio': return 'bg-red-100 dark:bg-red-900/30';
        case 'no_laborable': return 'bg-neutral-50 dark:bg-neutral-800/50';
        case 'ausencia': return 'bg-blue-50 dark:bg-blue-900/20';
    }
}

/**
 * Obtiene el color para los días sin imputar
 */
export function getColorDiasSinImputar(dias: number): { bg: string; text: string } {
    if (dias === 0) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' };
    if (dias <= 3) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' };
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' };
}

/**
 * Obtiene el color para la diferencia de horas
 */
export function getColorDiferencia(diferencia: number): string {
    if (diferencia >= 0) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * Formatea horas para mostrar (ej: 8.5 -> "8.5h", 176 -> "176h")
 */
export function formatHoras(horas: number): string {
    return `${Math.round(horas * 10) / 10}h`;
}

/**
 * Formatea diferencia con signo (ej: 5 -> "+5h", -10 -> "-10h")
 */
export function formatDiferencia(diferencia: number): string {
    const valor = Math.round(diferencia * 10) / 10;
    if (valor > 0) return `+${valor}h`;
    return `${valor}h`;
}

/**
 * Formatea una fecha para mostrar
 */
export function formatFecha(fecha: Date, formato: 'corto' | 'largo' | 'completo' = 'corto'): string {
    const dia = fecha.getDate();
    const mes = fecha.getMonth();
    const año = fecha.getFullYear();

    switch (formato) {
        case 'corto':
            return `${dia} ${MESES_CORTO[mes]}`;
        case 'largo':
            return `${dia} de ${MESES[mes]}`;
        case 'completo':
            return `${dia} de ${MESES[mes]} de ${año}`;
    }
}

// ============================================
// TIPOS
// ============================================

export type EstadoDia = 'completo' | 'incompleto' | 'vacio' | 'no_laborable' | 'ausencia';

export interface DiaInfo {
    fecha: Date;
    dia: number;
    diaSemana: number;
    diaSemanaLabel: string;
    esFinDeSemana: boolean;
    esFestivo: boolean;
    esLaborable: boolean;
    esAusencia?: boolean;
    tipoAusencia?: string;
    nombreFestivo?: string;
}

export interface DiaConHoras extends DiaInfo {
    horasPorProyecto: { projectId: string; projectCode: string; projectName: string; hours: number }[];
    totalHoras: number;
    notas: string[];
    estado: EstadoDia;
}

export const ABSENCE_TYPE_LABELS: Record<string, string> = {
    VACATION: 'Vacaciones',
    SICK_LEAVE: 'Baja Médica',
    PERSONAL: 'Asuntos Personales',
    MATERNITY: 'Maternidad',
    PATERNITY: 'Paternidad',
    UNPAID: 'Sin Sueldo',
    OTHER: 'Otro',
};

/**
 * Resultado de la compensación secuencial para un día.
 *
 * Las horas reales NUNCA se modifican.
 * Solo se añade información de compensación adicional.
 */
export interface CompensacionDia {
    fecha: Date;
    dia: number;
    diaSemanaLabel: string;
    esLaborable: boolean;
    esFinDeSemana: boolean;
    esFestivo: boolean;
    esAusencia?: boolean;
    /** Horas reales imputadas por el usuario (intocables) */
    horasReales: number;
    /** Horas sobrantes generadas por este día (real > 8) que pasan al saldo */
    horasSobrantes: number;
    /** Horas de compensación recibidas del saldo acumulado (para llegar a 8) */
    horasCompensacion: number;
    /** horasReales + horasCompensacion (valor mostrado en vista compensada) */
    totalHorasCompensado: number;
    /** Saldo de horas sobrantes disponibles DESPUÉS de procesar este día */
    saldoTrasElDia: number;
}

export interface ResumenMensual {
    año: number;
    mes: number;
    mesLabel: string;
    diasDelMes: DiaConHoras[];
    horasReales: number;
    horasPrevistas: number;
    diferencia: number;
    diasLaborables: number;
    diasConEntradas: number;
    diasSinImputar: number;
    diasIncompletos: number;
    porcentajeCumplimiento: number;
    totalesPorProyecto: { projectId: string; projectCode: string; projectName: string; hours: number }[];
    diasCompensados: CompensacionDia[];
}

/**
 * Aplica compensación secuencial hacia adelante sin modificar las horas reales.
 *
 * Reglas:
 * - Si un día tiene > 8h reales → el exceso (real - 8) se acumula en el saldo.
 * - Si un día tiene < 8h reales → se le suma compensación del saldo hasta llegar a 8.
 * - Fines de semana, festivos y ausencias no participan (compensación = 0).
 * - La compensación es estrictamente secuencial (solo hacia adelante, mismo mes).
 * - El saldo no se lleva al mes siguiente.
 */
export function calcularCompensacionHoras(diasDelMes: DiaConHoras[]): CompensacionDia[] {
    let saldo = 0;

    return diasDelMes.map(dia => {
        const horasReales = Math.round(dia.totalHoras * 100) / 100;
        let horasSobrantes = 0;
        let horasCompensacion = 0;

        if (dia.esLaborable && !dia.esAusencia) {
            if (horasReales > 8) {
                // Este día genera sobrante
                horasSobrantes = Math.round((horasReales - 8) * 100) / 100;
                saldo = Math.round((saldo + horasSobrantes) * 100) / 100;
            } else if (horasReales < 8 && saldo > 0) {
                // Este día recibe compensación del saldo acumulado
                const deficit = Math.round((8 - horasReales) * 100) / 100;
                horasCompensacion = Math.round(Math.min(deficit, saldo) * 100) / 100;
                saldo = Math.round((saldo - horasCompensacion) * 100) / 100;
            }
        }

        return {
            fecha: dia.fecha,
            dia: dia.dia,
            diaSemanaLabel: dia.diaSemanaLabel,
            esLaborable: dia.esLaborable,
            esFinDeSemana: dia.esFinDeSemana,
            esFestivo: dia.esFestivo,
            esAusencia: dia.esAusencia,
            horasReales,
            horasSobrantes,
            horasCompensacion,
            // Nunca superar 8h en la vista calculada
            totalHorasCompensado: horasReales > 8
                ? 8
                : Math.round((horasReales + horasCompensacion) * 100) / 100,
            saldoTrasElDia: saldo,
        };
    });
}

export interface ResumenUsuarioEquipo {
    userId: string;
    userName: string;
    userEmail: string;
    userImage: string | null;
    department: string;
    departmentLabel: string;
    departmentColor: string;
    jornadaDiaria: number;
    ultimoDiaImputado: Date | null;
    diasSinImputar: number;
    horasPrevistas: number;
    horasReales: number;
    diferencia: number;
    porcentajeCumplimiento: number;
}

export interface ResumenProyecto {
    projectId: string;
    projectCode: string;
    projectName: string;
    horasPorMes: Record<number, number>; // mes (0-11) -> horas
    totalHoras: number;
    porcentaje: number;
    desglosePorUsuario?: { userId: string; userName: string; hours: number; horasPorMes: Record<number, number> }[];
}

export interface ResumenAnualUsuario {
    userId: string;
    userName: string;
    department: string;
    departmentColor: string;
    horasPorMes: number[]; // 12 elementos (Ene-Dic)
    totalHoras: number;
    horasPrevistas: number;
    diferencia: number;
}

// ============================================
// TIPOS PARA MATRIZ DE HORAS
// ============================================

/** Celda de la matriz (intersección proyecto × persona) */
export interface MatrizCelda {
    reales: number;
    calculadas: number; // compensación secuencial aplicada, nunca > 8h/día
}

/** Fila de la matriz (un proyecto) */
export interface MatrizProyecto {
    projectId: string;
    projectCode: string;
    projectName: string;
    /** userId → MatrizCelda */
    celdas: Record<string, MatrizCelda>;
    /** Suma de todos los usuarios para este proyecto */
    totales: MatrizCelda;
}

/** Columna de la matriz (una persona) con sus totales */
export interface MatrizPersonaInfo {
    userId: string;
    userName: string;
    userImage: string | null;
    /** Horas previstas para el período (solo a nivel persona, no por proyecto) */
    previstas: number;
    reales: number;
    calculadas: number;
}

/** Resultado completo devuelto por getMatrizHoras */
export interface ResultadoMatriz {
    año: number;
    /** null = vista anual completa */
    mes: number | null;
    proyectos: MatrizProyecto[];
    personas: MatrizPersonaInfo[];
    totalesGlobales: { reales: number; calculadas: number; previstas: number };
}
