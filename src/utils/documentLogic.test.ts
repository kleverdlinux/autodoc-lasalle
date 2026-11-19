import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExportBaseFilename,
  buildOficioHeaderCode,
  computeDashboardStats,
  extractDocxTags,
  formatInstitutionalDate,
  getGenderAgreement,
  isValidDni,
  normalizeCarrera,
  normalizeTratamiento,
  summarizeBatchValidation,
  verifyAdminCredentials,
} from './documentLogic.ts';

describe('Lógica Documental — AutoDoc La Salle', () => {
  it('formatea fechas ISO al estándar institucional de Juliaca', () => {
    assert.equal(formatInstitutionalDate('2026-11-17'), 'Juliaca, 17 de noviembre del 2026');
    assert.equal(formatInstitutionalDate('2026-07-09'), 'Juliaca, 09 de julio del 2026');
  });

  it('aplica concordancia de género automática según Sr. / Srta.', () => {
    const fem = getGenderAgreement('Srta.');
    assert.equal(fem.articulo, 'la');
    assert.equal(fem.identificado, 'identificada');
    assert.equal(fem.interesado, 'de la interesada');

    const masc = getGenderAgreement('Sr.');
    assert.equal(masc.articulo, 'el');
    assert.equal(masc.identificado, 'identificado');
    assert.equal(masc.interesado, 'del interesado');
  });

  it('valida DNI de 8 dígitos y normaliza carreras/tratamientos desde Excel', () => {
    assert.equal(isValidDni('75708381'), true);
    assert.equal(isValidDni('12345'), false);
    assert.equal(normalizeCarrera('enfermeria'), 'Enfermería');
    assert.equal(normalizeCarrera('Protesis Dental'), 'Prótesis Dental');
    assert.equal(normalizeCarrera('fisioterapia'), 'Fisioterapia');
    assert.equal(normalizeCarrera('OPTOMETRIA'), 'Optometría');
    assert.equal(normalizeCarrera('Laboratorio Clínico'), 'Laboratorio Clínico');
    assert.equal(normalizeTratamiento('Sr.'), 'Sr.');
    assert.equal(normalizeTratamiento('Srta.'), 'Srta.');
  });

  it('genera código correlativo institucional y extrae variables {{tag}} desde XML', () => {
    assert.equal(
      buildOficioHeaderCode('INFORME', '5', '2026'),
      'INFORME N° 005 – 2026 – D – IESTP – SJBLS – JULIACA',
    );
    const mockXml = '<w:p><w:r><w:t>{{</w:t></w:r><w:r><w:t>apellidos_nombres}}</w:t></w:r> con DNI {{dni}}</w:p>';
    assert.deepEqual(extractDocxTags(mockXml), ['apellidos_nombres', 'dni']);
  });

  it('genera nombres de archivo específicos por documento sin texto genérico de la app', () => {
    const constName = buildExportBaseFilename(
      'constancia',
      { dni: '75708381', apellidosNombres: 'ARONI TURPO MADELEYNE' },
      { tipoDocumento: 'INFORME', numeroCorrelativo: '4', anioNumero: '2026', apellidosNombres: 'X' },
    );
    assert.equal(constName, 'Constancia_Egresado_75708381_ARONI_TURPO_MADELEYNE');

    const infName = buildExportBaseFilename(
      'oficio',
      { dni: '00000000', apellidosNombres: 'X' },
      { tipoDocumento: 'INFORME', numeroCorrelativo: '4', anioNumero: '2026', apellidosNombres: 'ACHAHUANCO ESTHEFANY' },
    );
    assert.equal(infName, 'INFORME_004_2026_ACHAHUANCO_ESTHEFANY');
  });

  it('valida credenciales de acceso admin / admin2026', () => {
    assert.equal(verifyAdminCredentials('admin', 'admin2026'), true);
    assert.equal(verifyAdminCredentials(' ADMIN ', 'admin2026'), true);
    assert.equal(verifyAdminCredentials('admin', 'incorrecta'), false);
    assert.equal(verifyAdminCredentials('docente', 'admin2026'), false);
  });

  it('resume la validación en vivo del lote masivo detectando DNIs inválidos y nombres vacíos', () => {
    const summary = summarizeBatchValidation([
      { apellidosNombres: 'ARONI TURPO MADELEYNE', dni: '75708381' },
      { apellidosNombres: 'QUISPE MAMANI DIEGO', dni: '1234' },
      { apellidosNombres: '   ', dni: '74125896' },
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.validCount, 1);
    assert.equal(summary.invalidCount, 2);
    assert.equal(summary.invalidDniCount, 1);
    assert.equal(summary.emptyNameCount, 1);
  });

  it('calcula correctamente las métricas del dashboard y agrupación por carrera', () => {
    const stats = computeDashboardStats([
      {
        id: '1',
        codigo: 'CONST-2026-001',
        tipo: 'Constancia de Egresado',
        beneficiario: 'ALUMNO 1',
        dni: '75708381',
        carrera: 'Farmacia',
        fechaEmision: '2026-11-19',
        creadoEn: '19/11/2026',
      },
      {
        id: '2',
        codigo: 'INFORME-005',
        tipo: 'Informe / Oficio',
        beneficiario: 'ALUMNO 2',
        dni: '75694315',
        carrera: 'Prótesis Dental',
        fechaEmision: '2026-11-19',
        creadoEn: '19/11/2026',
      },
      {
        id: '3',
        codigo: 'CONST-2026-002',
        tipo: 'Constancia de Egresado',
        beneficiario: 'ALUMNO 3',
        dni: '74125896',
        carrera: 'Farmacia',
        fechaEmision: '2026-11-19',
        creadoEn: '19/11/2026',
      },
    ]);
    assert.equal(stats.totalEmitidos, 3);
    assert.equal(stats.totalConstancias, 2);
    assert.equal(stats.totalOficios, 1);
    assert.equal(stats.minutosAhorrados, 36);
    assert.equal(stats.porCarrera[0].carrera, 'Farmacia');
    assert.equal(stats.porCarrera[0].cantidad, 2);
  });
});
