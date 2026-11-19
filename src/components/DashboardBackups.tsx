import { useMemo, useState, type ChangeEvent } from 'react';
import { saveAs } from 'file-saver';
import {
  Award,
  BarChart3,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FolderSync,
  HardDriveDownload,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AuditLogEntry, IssuedRecord, SystemBackupFile } from '../types/documents.ts';
import { buildExportBaseFilename, computeDashboardStats } from '../utils/documentLogic.ts';
import { exportHistoryToExcel } from '../utils/excelBatch.ts';
import type { ToastType } from './ToastContainer.tsx';

interface DashboardBackupsProps {
  records: IssuedRecord[];
  auditLogs: AuditLogEntry[];
  onReopenRecord: (record: IssuedRecord) => void;
  onRestoreBackup: (backup: SystemBackupFile) => void;
  onExportBackup: () => void;
  onExportExcelLog: () => void;
  onClearHistory: () => void;
  onNotify: (type: ToastType, title: string, description?: string) => void;
}

export function DashboardBackups({
  records,
  auditLogs,
  onReopenRecord,
  onRestoreBackup,
  onExportBackup,
  onExportExcelLog,
  onClearHistory,
  onNotify,
}: DashboardBackupsProps) {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const stats = useMemo(() => computeDashboardStats(records), [records]);
  const maxCareerCount = Math.max(1, ...stats.porCarrera.map((c) => c.cantidad));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.beneficiario.toLowerCase().includes(q) ||
        r.dni.toLowerCase().includes(q) ||
        r.codigo.toLowerCase().includes(q) ||
        r.carrera.toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q),
    );
  }, [records, search]);

  const handleExportExcel = () => {
    if (records.length === 0) return;
    const blob = exportHistoryToExcel(records);
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `Libro_Emisiones_LaSalle_${fecha}.xlsx`);
    onExportExcelLog();
    onNotify(
      'success',
      'Libro de Emisiones exportado a Excel',
      `${records.length} registro(s) guardados en formato .xlsx.`,
    );
  };

  const handleDownloadBackupJson = () => {
    const payload: SystemBackupFile = {
      app: 'AutoDoc La Salle',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      history: records,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `Respaldo_AutoDoc_LaSalle_${fecha}.json`);
    onExportBackup();
    onNotify(
      'success',
      'Respaldo completo descargado (.json)',
      `Incluye ${records.length} documento(s) y ${auditLogs.length} eventos de auditoría.`,
    );
  };

  const handleUploadBackupJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<SystemBackupFile>;
      if (parsed.app !== 'AutoDoc La Salle' || !Array.isArray(parsed.history)) {
        onNotify('error', 'Archivo de respaldo inválido', 'Selecciona un archivo .json generado por AutoDoc La Salle.');
        return;
      }
      onRestoreBackup({
        app: 'AutoDoc La Salle',
        version: parsed.version ?? '1.0',
        exportedAt: parsed.exportedAt ?? new Date().toISOString(),
        history: parsed.history,
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      });
    } catch {
      onNotify('error', 'No se pudo leer el respaldo JSON', 'Verifica que el archivo no esté dañado.');
    }
  };

  const handleRedownloadDocx = async (rec: IssuedRecord) => {
    if (!rec.payload) return;
    setDownloadingId(rec.id);
    try {
      const { buildConstanciaDocxBlob, buildOficioDocxBlob } = await import(
        '../utils/docxGenerator.ts'
      );
      if (rec.payload.mode === 'constancia') {
        const blob = await buildConstanciaDocxBlob(rec.payload.data);
        const name = buildExportBaseFilename('constancia', rec.payload.data, {
          tipoDocumento: 'INFORME',
          numeroCorrelativo: '001',
          anioNumero: '2026',
          apellidosNombres: '',
        });
        saveAs(blob, `${name}.docx`);
        onNotify('success', 'Respaldo Word regenerado', `${name}.docx`);
      } else {
        const blob = await buildOficioDocxBlob(rec.payload.data);
        const name = buildExportBaseFilename(
          'oficio',
          { dni: '', apellidosNombres: '' },
          rec.payload.data,
        );
        saveAs(blob, `${name}.docx`);
        onNotify('success', 'Respaldo Word regenerado', `${name}.docx`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const horasTexto =
    stats.minutosAhorrados >= 60
      ? `${(stats.minutosAhorrados / 60).toFixed(1)} h`
      : `${stats.minutosAhorrados} min`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 4 Tarjetas KPI del Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#002b59] text-white flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Emitidos</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats.totalEmitidos}</p>
            <p className="text-[11px] text-slate-400">
              {stats.totalRespaldados} con respaldo reimprimible
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Constancias</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats.totalConstancias}</p>
            <p className="text-[11px] text-slate-400">Egresados individuales</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#002b59] flex items-center justify-center shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Informes / Oficios</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats.totalOficios}</p>
            <p className="text-[11px] text-slate-400">
              + {stats.totalLotes} lotes ZIP y {stats.totalPersonalizados} libres
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Tiempo Ahorrado</p>
            <p className="text-2xl font-extrabold text-emerald-700">{horasTexto}</p>
            <p className="text-[11px] text-slate-400">Estimado (~12 min/doc manual)</p>
          </div>
        </div>
      </div>

      {/* Gráfico por Carrera + Centro de Respaldo Local */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Emisiones por Carrera Técnica</h3>
              <p className="text-xs text-slate-500">
                Distribución en tiempo real de los documentos generados.
              </p>
            </div>
          </div>

          {stats.porCarrera.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Genera tu primera Constancia o Informe para visualizar las estadísticas por carrera.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.porCarrera.map((item) => {
                const widthPct = Math.max(8, Math.round((item.cantidad / maxCareerCount) * 100));
                return (
                  <div key={item.carrera} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{item.carrera}</span>
                      <span className="text-[#002b59] font-bold">{item.cantidad}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#002b59] to-[#f5b038] transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderSync className="w-5 h-5 text-[#002b59]" />
              Respaldos Portátiles (Sin Base de Datos)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Cada documento emitido guarda su copia instantánea en este equipo para reabrirlo o
              descargarlo en Word. Además, puedes exportar o restaurar toda la base documental en
              un archivo <code className="bg-slate-100 px-1 rounded">.json</code> para llevarla a
              otra computadora.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleDownloadBackupJson}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b59] hover:bg-[#001f42] text-white font-semibold px-4 py-2.5 text-sm shadow-xs transition cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4" /> Descargar Respaldo Completo (.json)
            </button>

            <label className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold px-4 py-2.5 text-sm transition cursor-pointer">
              <Upload className="w-4 h-4 text-[#002b59]" /> Restaurar Respaldo (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleUploadBackupJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Tabla de Historial y Respaldos Individuales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Libro de Emisiones y Copias de Respaldo
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Reabre o vuelve a descargar en Word cualquier constancia o informe emitido.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar DNI, nombre o código..."
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59] w-60"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={records.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold px-4 py-2 text-sm shadow transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel (.xlsx)
            </button>

            {records.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-2 text-sm font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {records.length === 0
              ? 'Aún no se han generado documentos. Descarga una Constancia o Informe y su respaldo quedará guardado aquí.'
              : 'No se encontraron registros que coincidan con tu búsqueda.'}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Código</th>
                  <th className="px-4 py-2.5 text-left">Tipo</th>
                  <th className="px-4 py-2.5 text-left">Beneficiario / Destino</th>
                  <th className="px-4 py-2.5 text-left">DNI</th>
                  <th className="px-4 py-2.5 text-left">Carrera / Detalle</th>
                  <th className="px-4 py-2.5 text-left">Emisión</th>
                  <th className="px-4 py-2.5 text-center">Respaldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#002b59]">
                      {rec.codigo}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block rounded-full bg-blue-50 text-[#002b59] px-2.5 py-0.5 text-xs font-semibold">
                        {rec.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{rec.beneficiario}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{rec.dni}</td>
                    <td className="px-4 py-2.5 text-slate-600">{rec.carrera}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{rec.fechaEmision}</td>
                    <td className="px-4 py-2.5">
                      {rec.payload ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onReopenRecord(rec)}
                            title="Reabrir en el editor y vista previa A4"
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Reabrir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRedownloadDocx(rec)}
                            disabled={downloadingId === rec.id}
                            title="Descargar copia Word (.docx) de respaldo"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#002b59] hover:bg-[#001f42] disabled:opacity-50 text-white px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Word
                          </button>
                        </div>
                      ) : (
                        <span className="block text-center text-xs text-slate-400">Solo registro</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardBackups;
