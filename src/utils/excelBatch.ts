import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { AuditLogEntry, BatchRow, ConstanciaData, IssuedRecord } from '../types/documents.ts';
import { INSTITUTION_INFO } from '../data/institutional.ts';
import {
  isValidDni,
  normalizeCarrera,
  normalizeTratamiento,
  sanitizeFilename,
} from './documentLogic.ts';
import { buildConstanciaDocxBlob } from './docxGenerator.ts';

/**
 * Descarga una plantilla Excel (.xlsx) de ejemplo para que Administración
 * pueda llenar fácilmente la lista de egresados para generación masiva.
 */
export function downloadSampleExcelRoster(): Blob {
  const rows = [
    {
      Tratamiento: 'Srta.',
      'Apellidos y Nombres': 'ARONI TURPO MADELEYNE ABIGAIL',
      DNI: '75708381',
      Carrera: 'Farmacia',
      Semestre: '2026 - I',
      'Fecha Emision': '2026-11-17',
    },
    {
      Tratamiento: 'Sr.',
      'Apellidos y Nombres': 'QUISPE MAMANI DIEGO ARMANDO',
      DNI: '74125896',
      Carrera: 'Prótesis Dental',
      Semestre: '2026 - I',
      'Fecha Emision': '2026-11-17',
    },
    {
      Tratamiento: 'Srta.',
      'Apellidos y Nombres': 'CONDORI HUANCA LUCERO MILAGROS',
      DNI: '76891234',
      Carrera: 'Fisioterapia',
      Semestre: '2026 - I',
      'Fecha Emision': '2026-11-17',
    },
    {
      Tratamiento: 'Sr.',
      'Apellidos y Nombres': 'APAZA FLORES JHERSON KEVIN',
      DNI: '72984512',
      Carrera: 'Optometría',
      Semestre: '2026 - I',
      'Fecha Emision': '2026-11-17',
    },
    {
      Tratamiento: 'Srta.',
      'Apellidos y Nombres': 'TICONA VARGAS FIORELLA PAMELA',
      DNI: '75432198',
      Carrera: 'Enfermería',
      Semestre: '2026 - I',
      'Fecha Emision': '2026-11-17',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 12 },
    { wch: 32 },
    { wch: 14 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Egresados');
  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function getColumnValue(row: Record<string, unknown>, candidates: string[]): string {
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase();
    if (candidates.some((c) => cleanKey.includes(c))) {
      const val = row[key];
      return val !== undefined && val !== null ? String(val).trim() : '';
    }
  }
  return '';
}

function normalizeExcelDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lee un archivo Excel (.xlsx / .xls / .csv) y convierte cada fila en un BatchRow normalizado.
 */
export async function parseExcelRoster(file: File): Promise<BatchRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const worksheet = workbook.Sheets[firstSheet];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  return jsonRows
    .map((row) => {
      const nombre = getColumnValue(row, ['apellido', 'nombre', 'egresado', 'estudiante', 'alumno']);
      const dni = getColumnValue(row, ['dni', 'documento']);
      const trat = getColumnValue(row, ['tratamiento', 'sexo', 'sr']);
      const carreraRaw = getColumnValue(row, ['carrera', 'especialidad', 'programa']);
      const semestre = getColumnValue(row, ['semestre', 'periodo', 'ciclo']) || '2026 - I';
      const fechaRaw = getColumnValue(row, ['fecha']);

      if (!nombre) return null;

      return {
        tratamiento: normalizeTratamiento(trat),
        apellidosNombres: nombre.toUpperCase(),
        dni: dni.replace(/\D/g, '').slice(0, 8),
        carrera: normalizeCarrera(carreraRaw),
        semestre,
        fechaEmision: normalizeExcelDate(fechaRaw),
      } satisfies BatchRow;
    })
    .filter((item): item is BatchRow => item !== null);
}

/**
 * Genera todas las Constancias de Egresado en Word (.docx) de un lote Excel
 * y las empaqueta dentro de un único archivo .zip descargable.
 */
export async function generateBatchZipBlob(
  rows: BatchRow[],
  anioOficial = INSTITUTION_INFO.lemaAnual,
  directoraNombre = INSTITUTION_INFO.directoraDefault,
  directoraCargo = INSTITUTION_INFO.directoraCargo,
  onProgress?: (completed: number, total: number, currentName: string) => void,
): Promise<{ zipBlob: Blob; validCount: number }> {
  const zip = new JSZip();
  let validCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.(i, rows.length, row.apellidosNombres || `Registro ${i + 1}`);
    const data: ConstanciaData = {
      anioOficial,
      tratamiento: row.tratamiento,
      apellidosNombres: row.apellidosNombres,
      dni: isValidDni(row.dni) ? row.dni : row.dni.padStart(8, '0'),
      carrera: row.carrera,
      semestre: row.semestre,
      fechaEmision: row.fechaEmision,
      directoraNombre,
      directoraCargo,
    };

    const docxBlob = await buildConstanciaDocxBlob(data);
    const indexStr = String(i + 1).padStart(2, '0');
    const safeName = sanitizeFilename(row.apellidosNombres || `Egresado_${indexStr}`);
    zip.file(`${indexStr}_Constancia_${row.dni || 'SD'}_${safeName}.docx`, docxBlob);
    validCount++;
    onProgress?.(validCount, rows.length, row.apellidosNombres || `Registro ${i + 1}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { zipBlob, validCount };
}

/**
 * Exporta el historial de documentos emitidos a un libro Excel (.xlsx) oficial.
 */
export function exportHistoryToExcel(records: IssuedRecord[]): Blob {
  const rows = records.map((r, idx) => ({
    'N°': idx + 1,
    'Código Documento': r.codigo,
    'Tipo de Documento': r.tipo,
    'Egresado / Destinatario': r.beneficiario,
    DNI: r.dni,
    Carrera: r.carrera,
    'Fecha Emisión': r.fechaEmision,
    'Registrado el': r.creadoEn,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 24 },
    { wch: 36 },
    { wch: 12 },
    { wch: 28 },
    { wch: 15 },
    { wch: 22 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro_Emitidos');
  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Exporta la bitácora completa de auditoría a un archivo Excel (.xlsx).
 */
export function exportAuditToExcel(logs: AuditLogEntry[]): Blob {
  const rows = logs.map((l, idx) => ({
    'N°': idx + 1,
    'Fecha y Hora': l.fechaHora,
    Usuario: l.usuario,
    Acción: l.accion,
    Módulo: l.modulo,
    Detalle: l.detalle,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 12 },
    { wch: 24 },
    { wch: 22 },
    { wch: 48 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria');
  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
