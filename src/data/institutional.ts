import type { CarreraLaSalle, ConstanciaData, OficioData } from '../types/documents.ts';

export const INSTITUTION_INFO = {
  tipo: 'Instituto de Educación Superior Privado',
  nombreCorto: 'SAN JUAN BAUTISTA LA SALLE',
  nombreCompleto: 'Instituto de Educación Superior Privado San Juan Bautista La Salle',
  resolucion: 'RESOLUCIÓN MINISTERIAL N.° 0616-2004-ED',
  ruc: '20405255139',
  direccion: 'Jirón San Martín 868',
  direccionPie: 'Jr. San Martín N.° 868 – Juliaca',
  celular: '999177023',
  ciudad: 'Juliaca',
  lemaAnual: '"Año de la Esperanza y el Fortalecimiento de la Democracia"',
  directoraDefault: 'Jeanette Fely Tacuri Pinto',
  directoraFirma: 'MG. JEANETTE F. TACURI PINTO',
  directoraCargo: 'DIRECTORA',
  carrerasPie: 'Farmacia Técnica - Prótesis Dental - Terapia Física y Rehabilitación - Optometría Técnica',
};

export const CARRERAS_OFICIALES: CarreraLaSalle[] = [
  'Enfermería',
  'Farmacia',
  'Fisioterapia',
  'Optometría',
  'Prótesis Dental',
];

export const TRAMITES_TITULACION_SUGERIDOS: string[] = [
  'EXAMEN DE SUFICIENCIA PROFESIONAL',
  'EXAMEN DE SUFICIENCIA ACADÉMICA',
  'RÉCORD ACADÉMICO',
  'CONSTANCIA DE NO ADEUDO',
];

export const TRAMITES_PENDIENTES_SUGERIDOS: string[] = [
  'presentación del informe de prácticas preprofesionales',
  'solicitud de certificado de estudios superiores',
  'solicitud de certificados modulares',
  'solicitud de título técnico profesional',
];

export const DEFAULT_CONSTANCIA: ConstanciaData = {
  anioOficial: INSTITUTION_INFO.lemaAnual,
  tratamiento: 'Srta.',
  apellidosNombres: 'ARONI TURPO MADELEYNE ABIGAIL',
  dni: '75708381',
  carrera: 'Farmacia',
  semestre: '2026 - I',
  fechaEmision: '2026-11-17',
  directoraNombre: INSTITUTION_INFO.directoraDefault,
  directoraCargo: INSTITUTION_INFO.directoraCargo,
};

export const DEFAULT_OFICIO: OficioData = {
  anioOficial: INSTITUTION_INFO.lemaAnual,
  tipoDocumento: 'INFORME',
  numeroCorrelativo: '005',
  anioNumero: '2026',
  fechaEmision: '2026-11-17',
  destinatarioTratamiento: 'Señor(a)',
  destinatarioNombre: 'LISBETH G. CENTENO TITO',
  destinatarioCargo: 'JUEZA - 2do Juzgado de Paz Letrado Familia',
  destinatarioSede: 'Sede - Juliaca',
  asunto: 'Remite Informe',
  referencia: 'OFICIO N° 1857-2026-2JPL-J-CSJPU/PJ / EXP. 110-2026-FC',
  tratamiento: 'Srta.',
  apellidosNombres: 'ACHAHUANCO APAZA ESTHEFANY CATALINA',
  dni: '75694315',
  carrera: 'Prótesis Dental',
  periodoInicio: '2022-II',
  periodoFin: '2025-I',
  tramitesCumplidos: [...TRAMITES_TITULACION_SUGERIDOS],
  tramitesPendientes: [...TRAMITES_PENDIENTES_SUGERIDOS],
  directoraNombre: INSTITUTION_INFO.directoraDefault,
  directoraCargo: INSTITUTION_INFO.directoraCargo,
};
