'use client';

import ExcelJS from 'exceljs';

/**
 * Export data to Excel file
 */
export async function exportToExcel(data: any[], filename: string, sheetName: string = 'Data') {
    if (!data || data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Set columns with auto-width (approximate)
    worksheet.columns = headers.map(header => ({
        header: header,
        key: header,
        width: Math.max(header.length, 15) // Min width 15
    }));

    // Add rows
    worksheet.addRows(data);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Create blob and download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Format employees for export
 */
export function formatEmployeesForExport(employees: any[]) {
    return employees.map(emp => ({
        'Código': emp.employeeCode || '',
        'Nombre': emp.name || '',
        'Email': emp.email || '',
        'Departamento': emp.department?.replace(/_/g, ' ') || '',
        'Rol': emp.role || '',
        'Tipo Contrato': formatContractType(emp.contractType),
        'Fecha Contratación': emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('es-ES') : '',
        'Fecha Fin Contrato': emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString('es-ES') : '',
        'Días Vacaciones': emp.vacationDays || 22,
        'Estado': emp.isActive !== false ? 'Activo' : 'Inactivo',
        'Creado': emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('es-ES') : ''
    }));
}

/**
 * Format payroll records for export
 */
export function formatPayrollForExport(records: any[]) {
    return records.map(rec => ({
        'Empleado': rec.user?.name || '',
        'Código': rec.user?.employeeCode || '',
        'Departamento': rec.user?.department?.replace(/_/g, ' ') || '',
        'Período': rec.period,
        'Salario Base': formatCurrency(rec.baseSalary),
        'Horas Extra': formatCurrency(rec.overtime),
        'Bonificaciones': formatCurrency(rec.bonuses),
        'Deducciones': formatCurrency(rec.deductions),
        'Salario Neto': formatCurrency(rec.netSalary),
        'Estado': formatPayrollStatus(rec.status),
        'Fecha Pago': rec.paidAt ? new Date(rec.paidAt).toLocaleDateString('es-ES') : ''
    }));
}

function formatContractType(type: string | null): string {
    const types: Record<string, string> = {
        'INDEFINIDO': 'Indefinido',
        'TEMPORAL': 'Temporal',
        'OBRA_SERVICIO': 'Obra y Servicio',
        'PRACTICAS': 'Prácticas',
        'FORMACION': 'Formación'
    };
    return types[type || ''] || type || '';
}

function formatPayrollStatus(status: string): string {
    const statuses: Record<string, string> = {
        'DRAFT': 'Borrador',
        'PROCESSING': 'Procesando',
        'COMPLETED': 'Completado',
        'PAID': 'Pagado'
    };
    return statuses[status] || status;
}

function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '0,00 €';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}
