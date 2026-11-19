export type DocTemplateType = 'constancia' | 'oficio';

export type Tratamiento = 'Srta.' | 'Sr.';

export type CarreraLaSalle =
  | 'Enfermería'
  | 'Farmacia'
  | 'Fisioterapia'
  | 'Optometría'
  | 'Prótesis Dental';

export interface ConstanciaData {
  anioOficial: string;
  tratamiento: Tratamiento;
  apellidosNombres: string;
  dni: string;
  carrera: string;
  semestre: string;
  fechaEmision: string; // YYYY-MM-DD
  directoraNombre: string;
  directoraCargo: string;
}

export interface OficioData {
  anioOficial: string;
  tipoDocumento: 'INFORME' | 'OFICIO';
  numeroCorrelativo: string;
  anioNumero: string;
  fechaEmision: string; // YYYY-MM-DD
  destinatarioTratamiento: 'Señor(a)' | 'Señor' | 'Señora';
  destinatarioNombre: string;
  destinatarioCargo: string;
  destinatarioSede: string;
  asunto: string;
  referencia: string;
  tratamiento: Tratamiento;
  apellidosNombres: string;
  dni: string;
  carrera: string;
  periodoInicio: string;
  periodoFin: string;
  tramitesCumplidos: string[];
  tramitesPendientes: string[];
  directoraNombre: string;
  directoraCargo: string;
}

export interface BatchRow {
  tratamiento: Tratamiento;
  apellidosNombres: string;
  dni: string;
  carrera: string;
  semestre: string;
  fechaEmision: string;
}

export type IssuedPayload =
  | { mode: 'constancia'; data: ConstanciaData }
  | { mode: 'oficio'; data: OficioData };

export interface IssuedRecord {
  id: string;
  codigo: string;
  tipo: 'Constancia de Egresado' | 'Informe / Oficio' | 'Lote Masivo (ZIP)' | 'Plantilla Personalizada';
  beneficiario: string;
  dni: string;
  carrera: string;
  fechaEmision: string;
  creadoEn: string;
  payload?: IssuedPayload;
}

export type AuditAction =
  | 'INICIO_SESION'
  | 'CIERRE_SESION'
  | 'EMISION_CONSTANCIA'
  | 'EMISION_INFORME'
  | 'EMISION_LOTE_ZIP'
  | 'PLANTILLA_PERSONALIZADA'
  | 'REIMPRESION_RESPALDO'
  | 'EXPORTACION_EXCEL'
  | 'RESPALDO_SISTEMA';

export interface AuditLogEntry {
  id: string;
  fechaHora: string;
  usuario: string;
  accion: AuditAction;
  modulo: string;
  detalle: string;
}

export interface SystemBackupFile {
  app: 'AutoDoc La Salle';
  version: string;
  exportedAt: string;
  history: IssuedRecord[];
  auditLogs: AuditLogEntry[];
}
