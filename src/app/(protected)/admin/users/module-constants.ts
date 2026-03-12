/** All available module keys across all sections */
export const MODULE_KEYS = [
    // Superadmin
    'superadmin-panel',
    'superadmin-empresas',
    'superadmin-logs',

    // Principal
    'inicio',
    'calendario',
    'mis-ausencias',
    'mis-tareas',
    'notificaciones',

    // Proyectos
    'tablero',
    'registro-diario',
    'control-horas',
    'aprobacion',
    'cep',

    // CRM
    'crm-dashboard',
    'crm-pipeline',
    'crm-clientes',
    'crm-leads',
    'crm-cotizaciones',
    'crm-actividades',

    // RRHH
    'rrhh-ausencias',
    'rrhh-festivos',

    // Administración
    'admin-proyectos',
    'admin-clientes',
    'admin-usuarios',
    'admin-departamentos',
    'admin-equipos',

    // Configuración
    'configuracion',
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];
