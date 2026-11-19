import { useMemo, useState, type ChangeEvent } from 'react';
import { saveAs } from 'file-saver';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  BatchRow,
  ConstanciaData,
  IssuedRecord,
  Tratamiento,
} from '../types/documents.ts';
import {
  DEFAULT_OFICIO,
  INSTITUTION_INFO,
} from '../data/institutional.ts';
import { CarreraInput } from './CarreraInput.tsx';
import {
  isValidDni,
  sanitizeFilename,
  summarizeBatchValidation,
} from '../utils/documentLogic.ts';
import { buildConstanciaDocxBlob } from '../utils/docxGenerator.ts';
import {
  downloadSampleExcelRoster,
  generateBatchZipBlob,
  parseExcelRoster,
} from '../utils/excelBatch.ts';
import { DocumentPreviewA4 } from './DocumentPreviewA4.tsx';
import type { ToastType } from './ToastContainer.tsx';

interface BatchExcelGeneratorProps {
  onAddHistory: (record: Omit<IssuedRecord, 'id' | 'creadoEn'>) => void;
  onNotify: (type: ToastType, title: string, description?: string) => void;
}

function rowToConstanciaData(row: BatchRow): ConstanciaData {
  return {
    anioOficial: INSTITUTION_INFO.lemaAnual,
    tratamiento: row.tratamiento,
    apellidosNombres: row.apellidosNombres,
    dni: row.dni,
    carrera: row.carrera,
    semestre: row.semestre,
    fechaEmision: row.fechaEmision,
    directoraNombre: INSTITUTION_INFO.directoraDefault,
    directoraCargo: INSTITUTION_INFO.directoraCargo,
  };
}

export function BatchExcelGenerator({ onAddHistory, onNotify }: BatchExcelGeneratorProps) {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
    currentName: string;
  } | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const validation = useMemo(() => summarizeBatchValidation(rows), [rows]);

  const handleDownloadSample = () => {
    const blob = downloadSampleExcelRoster();
    saveAs(blob, 'Plantilla_Egresados_LaSalle.xlsx');
    onNotify('info', 'Excel modelo descargado', 'Llena las filas y súbelo para generar el lote ZIP.');
  };

  const handleUploadExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const parsed = await parseExcelRoster(file);
    setRows(parsed);
    e.target.value = '';

    if (parsed.length === 0) {
      onNotify(
        'error',
        'No se detectaron filas válidas',
        'Verifica las columnas usando el botón "Descargar Excel Modelo".',
      );
      return;
    }

    const summary = summarizeBatchValidation(parsed);
    if (summary.invalidCount > 0) {
      onNotify(
        'info',
        `${parsed.length} registros cargados (${summary.invalidCount} por revisar)`,
        'Corrige los DNI marcados en rojo directamente en la tabla antes de generar el ZIP.',
      );
    } else {
      onNotify(
        'success',
        `${parsed.length} egresados validados al 100%`,
        'Listo para previsualizar o generar el paquete ZIP.',
      );
    }
  };

  const updateRow = <K extends keyof BatchRow>(index: number, field: K, value: BatchRow[K]) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };

  const handleAddEmptyRow = () => {
    setRows((prev) => [
      ...prev,
      {
        tratamiento: 'Srta.',
        apellidosNombres: '',
        dni: '',
        carrera: 'Farmacia',
        semestre: '2026 - I',
        fechaEmision: new Date().toISOString().slice(0, 10),
      },
    ]);
    if (!fileName) setFileName('Carga_Manual.xlsx');
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
    if (previewIndex === index) setPreviewIndex(null);
  };

  const handleDownloadSingleFromPreview = async (row: BatchRow) => {
    const data = rowToConstanciaData(row);
    const blob = await buildConstanciaDocxBlob(data);
    const safeName = sanitizeFilename(row.apellidosNombres || 'Egresado');
    saveAs(blob, `Constancia_Egresado_${row.dni || 'SD'}_${safeName}.docx`);
    onNotify('success', 'Constancia individual descargada', row.apellidosNombres);
  };

  const handleGenerateZip = async () => {
    if (rows.length === 0) return;
    if (validation.invalidCount > 0) {
      onNotify(
        'error',
        `Hay ${validation.invalidCount} fila(s) con datos incompletos o DNI inválido`,
        'Corrige las casillas marcadas en rojo directamente en la tabla para continuar.',
      );
      return;
    }

    setIsProcessing(true);
    setProgress({ completed: 0, total: rows.length, currentName: rows[0]?.apellidosNombres ?? '' });
    try {
      const { zipBlob, validCount } = await generateBatchZipBlob(
        rows,
        INSTITUTION_INFO.lemaAnual,
        INSTITUTION_INFO.directoraDefault,
        INSTITUTION_INFO.directoraCargo,
        (completed, total, currentName) => {
          setProgress({ completed, total, currentName });
        },
      );
      const fecha = new Date().toISOString().slice(0, 10);
      saveAs(zipBlob, `Constancias_LaSalle_Lote_${fecha}.zip`);
      onNotify(
        'success',
        `Lote ZIP generado (${validCount} constancias)`,
        `Archivo: Constancias_LaSalle_Lote_${fecha}.zip`,
      );
      onAddHistory({
        codigo: `LOTE-${fecha}`,
        tipo: 'Lote Masivo (ZIP)',
        beneficiario: `${validCount} egresados (${fileName || 'Manual'})`,
        dni: 'MÚLTIPLE',
        carrera: 'Varias carreras',
        fechaEmision: fecha,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(null), 1200);
    }
  };

  const progressPct =
    progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  const previewRow = previewIndex !== null ? rows[previewIndex] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#002b59]" />
              Generación Masiva desde Padrón Excel (.xlsx → .zip)
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Valida los DNI en vivo, edita directamente en la tabla y previsualiza cualquier hoja
              A4 antes de generar el paquete ZIP.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddEmptyRow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3.5 py-2 text-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#002b59]" /> Añadir Fila
            </button>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 text-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#002b59]" /> Descargar Excel Modelo
            </button>
          </div>
        </div>

        <div className="mt-5">
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#002b59] bg-slate-50/70 hover:bg-blue-50/40 p-7 transition cursor-pointer">
            <Upload className="w-8 h-8 text-[#002b59] mb-2" />
            <span className="text-sm font-semibold text-slate-800">
              {fileName
                ? `Archivo activo: ${fileName} (haz clic para reemplazar)`
                : 'Haz clic para subir tu Excel (.xlsx o .csv)'}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Columnas recomendadas: Tratamiento, Apellidos y Nombres, DNI, Carrera, Semestre, Fecha
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadExcel}
              className="hidden"
            />
          </label>
        </div>

        {/* Barra de progreso en tiempo real */}
        {progress && (
          <div className="mt-5 rounded-xl bg-blue-50/80 border border-blue-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#002b59]">
              <span className="truncate">
                Empaquetando ({progress.completed} de {progress.total}):{' '}
                <span className="font-normal text-slate-700">{progress.currentName}</span>
              </span>
              <span className="font-mono font-bold ml-3">{progressPct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-blue-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#002b59] to-[#f5b038] transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* Resumen de validación en vivo + botón generar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  {validation.validCount} válidas
                </span>
                {validation.invalidCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 px-3 py-1 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    {validation.invalidCount} con observación (edita directo en la tabla)
                  </span>
                ) : (
                  <span className="text-slate-600 font-medium">
                    Todos los DNI y nombres cumplen el formato oficial.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateZip}
                disabled={isProcessing || validation.invalidCount > 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b59] hover:bg-[#001f42] disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 text-sm shadow transition cursor-pointer shrink-0"
              >
                <FileArchive className="w-4 h-4" />
                {isProcessing
                  ? `Generando (${progressPct}%)...`
                  : `Generar ${rows.length} Constancias (.zip)`}
              </button>
            </div>

            {/* Tabla editable con validación visual en vivo */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                  <tr>
                    <th className="px-2.5 py-2.5 text-left w-10">#</th>
                    <th className="px-2.5 py-2.5 text-left w-24">Trat.</th>
                    <th className="px-2.5 py-2.5 text-left min-w-[210px]">Apellidos y Nombres</th>
                    <th className="px-2.5 py-2.5 text-left w-36">DNI (8 dígitos)</th>
                    <th className="px-2.5 py-2.5 text-left min-w-[180px]">Carrera</th>
                    <th className="px-2.5 py-2.5 text-left w-28">Semestre</th>
                    <th className="px-2.5 py-2.5 text-left w-36">Fecha</th>
                    <th className="px-2.5 py-2.5 text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((r, idx) => {
                    const dniOk = isValidDni(r.dni);
                    const nameOk = r.apellidosNombres.trim().length > 0;
                    const rowInvalid = !dniOk || !nameOk;

                    return (
                      <tr
                        key={idx}
                        className={rowInvalid ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'}
                      >
                        <td className="px-2.5 py-2 text-slate-500 font-medium">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <select
                            value={r.tratamiento}
                            onChange={(e) =>
                              updateRow(idx, 'tratamiento', e.target.value as Tratamiento)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#002b59]"
                          >
                            <option value="Srta.">Srta.</option>
                            <option value="Sr.">Sr.</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={r.apellidosNombres}
                            onChange={(e) =>
                              updateRow(idx, 'apellidosNombres', e.target.value.toUpperCase())
                            }
                            placeholder="APELLIDOS Y NOMBRES"
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase focus:outline-none focus:ring-2 ${
                              nameOk
                                ? 'border-slate-300 bg-white focus:ring-[#002b59]'
                                : 'border-rose-400 bg-rose-50 focus:ring-rose-500'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={8}
                              value={r.dni}
                              onChange={(e) =>
                                updateRow(idx, 'dni', e.target.value.replace(/\D/g, '').slice(0, 8))
                              }
                              placeholder="8 dígitos"
                              className={`w-full rounded-lg border pl-2.5 pr-7 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 ${
                                dniOk
                                  ? 'border-emerald-300 bg-emerald-50/40 text-slate-900 focus:ring-emerald-500'
                                  : 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                              }`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              {dniOk ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              )}
                            </span>
                          </div>
                          {!dniOk && (
                            <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                              {r.dni.length}/8 dígitos
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <CarreraInput
                            value={r.carrera}
                            onChange={(val) => updateRow(idx, 'carrera', val)}
                            compact
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={r.semestre}
                            onChange={(e) => updateRow(idx, 'semestre', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#002b59]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={r.fechaEmision}
                            onChange={(e) => updateRow(idx, 'fechaEmision', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#002b59]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewIndex(idx)}
                              title="Previsualizar hoja A4"
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-[#002b59] text-[#002b59] hover:text-white px-2 py-1.5 text-xs font-semibold transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Ver</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              title="Eliminar fila"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Vista Previa A4 de una fila del lote */}
      {previewRow && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#002b59] text-white px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">
                  Vista Previa Individual del Lote — Fila #{(previewIndex ?? 0) + 1}
                </p>
                <p className="text-sm font-bold truncate">
                  {previewRow.apellidosNombres || 'Sin nombre'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFromPreview(previewRow)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b038] hover:bg-amber-400 text-[#001b38] font-bold px-3 py-1.5 text-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar .docx
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  aria-label="Cerrar vista previa"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-5">
              <DocumentPreviewA4
                mode="constancia"
                constancia={rowToConstanciaData(previewRow)}
                oficio={DEFAULT_OFICIO}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchExcelGenerator;
