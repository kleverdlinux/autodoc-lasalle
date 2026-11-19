import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  Award,
  BarChart3,
  Clock,
  Database,
  Download,
  FileCheck2,
  FileSpreadsheet,
  PieChart,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { IssuedRecord } from '../types/documents.ts';
import { CARRERAS_OFICIALES } from '../data/institutional.ts';
import { buildExportBaseFilename, computeDashboardStats } from '../utils/documentLogic.ts';
import { exportHistoryToExcel } from '../utils/excelBatch.ts';
import type { ToastType } from './ToastContainer.tsx';

interface DashboardBackupsProps {
  records: IssuedRecord[];
  dbConnected: boolean;
  onReopenRecord: (record: IssuedRecord) => void;
  onExportExcelLog: () => void;
  onClearHistory: () => void;
  onNotify: (type: ToastType, title: string, description?: string) => void;
}

const SHORT_CAREER_LABEL: Record<string, string> = {
  Enfermería: 'Enfermería',
  Farmacia: 'Farmacia',
  Fisioterapia: 'Fisioterapia',
  Optometría: 'Optometría',
  'Prótesis Dental': 'Prót. Dental',
};

export function DashboardBackups({
  records,
  dbConnected,
  onReopenRecord,
  onExportExcelLog,
  onClearHistory,
  onNotify,
}: DashboardBackupsProps) {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const stats = useMemo(() => computeDashboardStats(records), [records]);

  // Asegura mostrar siempre las 5 carreras oficiales en el gráfico de barras
  const careerSeries = useMemo(() => {
    const map = new Map<string, number>();
    CARRERAS_OFICIALES.forEach((c) => map.set(c, 0));
    stats.porCarrera.forEach((item) => {
      if (item.carrera !== 'Varias carreras' && item.carrera !== 'Sin especificar') {
        map.set(item.carrera, (map.get(item.carrera) ?? 0) + item.cantidad);
      }
    });
    return Array.from(map.entries()).map(([carrera, cantidad]) => ({
      carrera,
      label: SHORT_CAREER_LABEL[carrera] ?? carrera,
      cantidad,
    }));
  }, [stats.porCarrera]);

  const maxBar = Math.max(1, ...careerSeries.map((c) => c.cantidad));

  // Datos para el gráfico circular (Donut SVG) por tipo de documento
  const donutSegments = useMemo(() => {
    const items = [
      { label: 'Constancias', count: stats.totalConstancias, color: '#002b59' },
      { label: 'Informes / Oficios', count: stats.totalOficios, color: '#f5b038' },
      { label: 'Lotes Excel (ZIP)', count: stats.totalLotes, color: '#059669' },
      { label: 'Plantillas Libres', count: stats.totalPersonalizados, color: '#6366f1' },
    ];
    const total = items.reduce((acc, i) => acc + i.count, 0);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    const segments = items.map((item) => {
      const fraction = total > 0 ? item.count / total : 0;
      const dash = fraction * circumference;
      const seg = {
        ...item,
        pct: total > 0 ? Math.round(fraction * 100) : 0,
        dash,
        gap: circumference - dash,
        offset: -offsetAcc,
      };
      offsetAcc += dash;
      return seg;
    });

    return { total, radius, circumference, segments };
  }, [stats]);

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
      {/* Encabezado discreto del Dashboard con indicador de BD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard Ejecutivo de Emisiones</h2>
          <p className="text-xs text-slate-500">
            Métricas en tiempo real, gráficos estadísticos y copias de respaldo por documento.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${
            dbConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          {dbConnected ? 'PostgreSQL Conectado' : 'Modo Local'}
        </span>
      </div>

      {/* 4 Tarjetas KPI */}
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

      {/* Dos Gráficos Estadísticos Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Barras Verticales por Carrera */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#002b59]" />
                Emisiones por Carrera Técnica
              </h3>
              <p className="text-xs text-slate-500">
                Volumen de documentos generados por especialidad académica.
              </p>
            </div>
          </div>

          <div className="relative pt-4">
            {/* Líneas horizontales de referencia */}
            <div className="absolute inset-x-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="border-b border-dashed border-slate-200/80 w-full" />
              ))}
            </div>

            <div className="relative z-10 grid grid-cols-5 gap-3 sm:gap-5 items-end h-44 px-2">
              {careerSeries.map((item) => {
                const heightPct =
                  item.cantidad > 0 ? Math.max(16, Math.round((item.cantidad / maxBar) * 100)) : 6;
                return (
                  <div key={item.carrera} className="flex flex-col items-center h-full justify-end">
                    <span className="text-xs font-extrabold text-[#002b59] mb-1.5">
                      {item.cantidad}
                    </span>
                    <div className="w-full max-w-[46px] h-32 flex items-end justify-center">
                      <div
                        title={`${item.carrera}: ${item.cantidad}`}
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          item.cantidad > 0
                            ? 'bg-gradient-to-t from-[#002b59] via-[#003b75] to-[#f5b038] shadow-sm'
                            : 'bg-slate-100'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className="mt-2 text-[11px] font-semibold text-slate-600 text-center leading-tight truncate w-full"
                      title={item.carrera}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Donut Circular por Tipo de Documento */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#002b59]" />
              Distribución por Tipo de Documento
            </h3>
            <p className="text-xs text-slate-500">
              Proporción porcentual del flujo documental automatizado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                <circle
                  cx="65"
                  cy="65"
                  r={donutSegments.radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                {donutSegments.total > 0 &&
                  donutSegments.segments.map((seg) =>
                    seg.count > 0 ? (
                      <circle
                        key={seg.label}
                        cx="65"
                        cy="65"
                        r={donutSegments.radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="16"
                        strokeDasharray={`${seg.dash} ${seg.gap}`}
                        strokeDashoffset={seg.offset}
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                    ) : null,
                  )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">
                  {donutSegments.total}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">
                  Total
                </span>
              </div>
            </div>

            {/* Leyenda */}
            <div className="w-full space-y-2">
              {donutSegments.segments.map((seg) => (
                <div
                  key={seg.label}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-slate-700 font-medium truncate">{seg.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 whitespace-nowrap">
                    {seg.count}{' '}
                    <span className="text-slate-400 font-normal">({seg.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
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
