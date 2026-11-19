import type {
  BatchRow,
  ConstanciaData,
  DocTemplateType,
  IssuedRecord,
  OficioData,
  Tratamiento,
} from '../types/documents.ts';

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Formatea una fecha ISO (YYYY-MM-DD) al formato institucional peruano:
 * "Juliaca, 17 de noviembre del 2026"
 */
export function formatInstitutionalDate(isoDate: string, ciudad = 'Juliaca'): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return `${ciudad}, ${isoDate}`;
  }
  const [year, month, day] = parts;
  const mesNombre = MESES_ES[month - 1] ?? '';
  if (!mesNombre) return `${ciudad}, ${isoDate}`;
  const dayStr = String(day).padStart(2, '0');
  return `${ciudad}, ${dayStr} de ${mesNombre} del ${year}`;
}

/**
 * Devuelve la concordancia gramatical de género según el tratamiento (Sr. / Srta.).
 */
export function getGenderAgreement(tratamiento: Tratamiento) {
  const isFemale = tratamiento === 'Srta.';
  return {
    articulo: isFemale ? 'la' : 'el',
    tratamientoLargo: isFemale ? 'la señorita' : 'el señor',
    tratamientoCorto: isFemale ? 'la Srta.' : 'el Sr.',
    tratamientoCortoCap: isFemale ? 'La Srta.' : 'El Sr.',
    identificado: isFemale ? 'identificada' : 'identificado',
    egresado: isFemale ? 'egresada' : 'egresado',
    interesado: isFemale ? 'de la interesada' : 'del interesado',
  };
}

/**
 * Valida si un DNI tiene exactamente 8 dígitos numéricos.
 */
export function isValidDni(dni: string): boolean {
  return /^\d{8}$/.test(dni.trim());
}

/**
 * Normaliza un nombre de carrera ingresado desde Excel hacia las 5 carreras oficiales,
 * o conserva el nombre personalizado si pertenece a otra especialidad.
 */
export function normalizeCarrera(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Farmacia';

  const lower = trimmed.toLowerCase();
  if (lower.includes('enfermer')) {
    return 'Enfermería';
  }
  if (lower.includes('farmacia')) {
    return 'Farmacia';
  }
  if (lower.includes('fisioterapia') || lower.includes('terapia') || lower.includes('rehabilit')) {
    return 'Fisioterapia';
  }
  if (lower.includes('optometr')) {
    return 'Optometría';
  }
  if (lower.includes('prótesis') || lower.includes('protesis') || lower.includes('dental')) {
    return 'Prótesis Dental';
  }
  return trimmed;
}

/**
 * Normaliza el tratamiento (Sr. o Srta.) desde texto libre o Excel.
 */
export function normalizeTratamiento(raw: string): Tratamiento {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith('sr.') || lower === 'sr' || lower === 'm' || lower === 'masculino' || lower === 'señor') {
    return 'Sr.';
  }
  return 'Srta.';
}

/**
 * Construye el código oficial del Informe / Oficio:
 * ej. "INFORME N° 005 – 2026 – D – IESTP – SJBLS – JULIACA"
 */
export function buildOficioHeaderCode(tipo: 'INFORME' | 'OFICIO', numero: string, anio: string): string {
  const cleanNum = numero.trim().padStart(3, '0') || '001';
  const cleanAnio = anio.trim() || '2026';
  return `${tipo} N° ${cleanNum} – ${cleanAnio} – D – IESTP – SJBLS – JULIACA`;
}

/**
 * Extrae etiquetas únicas {{variable}} de un texto XML de plantilla Word (.docx),
 * limpiando posibles fragmentos XML internos de Word que rompen una etiqueta.
 */
export function extractDocxTags(xmlContent: string): string[] {
  // Elimina etiquetas XML intermedias dentro de la cadena para rescatar {{variables}} partidas por Word
  const plainText = xmlContent.replace(/<[^>]+>/g, '');
  const regex = /\{\{\s*([a-zA-Z0-9_.\-áéíóúÁÉÍÓÚñÑ]+)\s*\}\}/g;
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(plainText)) !== null) {
    if (match[1]) {
      tags.add(match[1]);
    }
  }
  return Array.from(tags);
}

/**
 * Formatea un nombre seguro de archivo removiendo caracteres inválidos.
 */
export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Construye el nombre de archivo único y descriptivo para descargar Word (.docx)
 * o sugerirlo al guardar como PDF desde el navegador.
 */
export function buildExportBaseFilename(
  mode: DocTemplateType,
  constancia: Pick<ConstanciaData, 'dni' | 'apellidosNombres'>,
  oficio: Pick<OficioData, 'tipoDocumento' | 'numeroCorrelativo' | 'anioNumero' | 'apellidosNombres'>,
): string {
  if (mode === 'constancia') {
    const safeName = sanitizeFilename(constancia.apellidosNombres || 'Egresado');
    return `Constancia_Egresado_${constancia.dni || 'SD'}_${safeName}`;
  }
  const safeName = sanitizeFilename(oficio.apellidosNombres || 'Estudiante');
  const num = oficio.numeroCorrelativo.trim().padStart(3, '0') || '001';
  const anio = oficio.anioNumero.trim() || '2026';
  return `${oficio.tipoDocumento}_${num}_${anio}_${safeName}`;
}

/**
 * Valida las credenciales administrativas de acceso al sistema.
 */
export function verifyAdminCredentials(usuario: string, password: string): boolean {
  return usuario.trim().toLowerCase() === 'admin' && password === 'admin2026';
}

/**
 * Valida una fila del lote masivo de Excel verificando nombre y DNI de 8 dígitos.
 */
export function isBatchRowValid(row: Pick<BatchRow, 'apellidosNombres' | 'dni'>): boolean {
  return row.apellidosNombres.trim().length > 0 && isValidDni(row.dni);
}

/**
 * Calcula un resumen de validación para el lote completo de egresados.
 */
export function summarizeBatchValidation(rows: Pick<BatchRow, 'apellidosNombres' | 'dni'>[]) {
  let validCount = 0;
  let invalidDniCount = 0;
  let emptyNameCount = 0;

  for (const row of rows) {
    const hasName = row.apellidosNombres.trim().length > 0;
    const hasDni = isValidDni(row.dni);
    if (!hasName) emptyNameCount++;
    if (!hasDni) invalidDniCount++;
    if (hasName && hasDni) validCount++;
  }

  return {
    total: rows.length,
    validCount,
    invalidCount: rows.length - validCount,
    invalidDniCount,
    emptyNameCount,
  };
}

/**
 * Calcula métricas agregadas para el Dashboard ejecutivo a partir del historial emitido.
 */
export function computeDashboardStats(records: IssuedRecord[]) {
  let totalConstancias = 0;
  let totalOficios = 0;
  let totalLotes = 0;
  let totalPersonalizados = 0;
  let totalRespaldados = 0;
  const careerMap = new Map<string, number>();

  for (const r of records) {
    if (r.tipo === 'Constancia de Egresado') totalConstancias++;
    else if (r.tipo === 'Informe / Oficio') totalOficios++;
    else if (r.tipo === 'Lote Masivo (ZIP)') totalLotes++;
    else totalPersonalizados++;

    if (r.payload) totalRespaldados++;

    const careerKey = r.carrera.trim() || 'Sin especificar';
    careerMap.set(careerKey, (careerMap.get(careerKey) ?? 0) + 1);
  }

  // Estimación conservadora: 12 min ahorrados por documento automatizado
  const minutosAhorrados = records.length * 12;

  const porCarrera = Array.from(careerMap.entries())
    .map(([carrera, cantidad]) => ({ carrera, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    totalEmitidos: records.length,
    totalConstancias,
    totalOficios,
    totalLotes,
    totalPersonalizados,
    totalRespaldados,
    minutosAhorrados,
    porCarrera,
  };
}
