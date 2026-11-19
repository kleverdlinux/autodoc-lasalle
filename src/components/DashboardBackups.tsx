import { useEffect, useMemo, useState } from 'react';
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
  PlusCircle,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import type { DocTemplateType, IssuedRecord } from '../types/documents.ts';
import { CARRERAS_OFICIALES } from '../data/institutional.ts';
import { buildExportBaseFilename, computeDashboardStats } from '../utils/documentLogic.ts';
import { exportHistoryToExcel } from '../utils/excelBatch.ts';
import type { ToastType } from './ToastContainer.tsx';
import type { ActiveTab } from './Header.tsx';

interface DashboardBackupsProps {
  records: IssuedRecord[];
  dbConnected: boolean;
  onReopenRecord: (record: IssuedRecord) => void;
  onQuickCreate: (tab: ActiveTab, docMode?: DocTemplateType) => void;
  onExportExcelLog: () => void;
  onClearHistory: () => void;
  onNotify: (type: ToastType, title: string, description?: string) => void;
}

const CAREER_STYLE_MAP: Record<
  string,
  { short: string; gradient: string; glow: string; badge: string }
> = {
  Enfermería: {
    short: 'Enfermería',
    gradient: 'from-sky-400 to-blue-500',
    glow: 'shadow-sky-400/40',
    badge: 'text-sky-600',
  },
  Farmacia: {
    short: 'Farmacia',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-400/40',
    badge: 'text-emerald-600',
  },
  Fisioterapia: {
    short: 'Fisioterapia',
    gradient: 'from-indigo-400 to-violet-500',
    glow: 'shadow-indigo-400/40',
    badge: 'text-indigo-600',
  },
  Optometría: {
    short: 'Optometría',
    gradient: 'from-amber-400 to-orange-400',
    glow: 'shadow-amber-400/40',
    badge: 'text-amber-600',
  },
  'Prótesis Dental': {
    short: 'Prót. Dental',
    gradient: 'from-rose-400 to-pink-500',
    glow: 'shadow-rose-400/40',
    badge: 'text-rose-600',
  },
};

export function DashboardBackups({
  records,
  dbConnected,
  onReopenRecord,
  onQuickCreate,
  onExportExcelLog,
  onClearHistory,
  onNotify,
}: DashboardBackupsProps) {
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [chartsAnimated, setChartsAnimated] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setChartsAnimated(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const stats = useMemo(() => computeDashboardStats(records), [records]);

  const careerSeries = useMemo(() => {
    const map = new Map<string, number>();
    CARRERAS_OFICIALES.forEach((c) => map.set(c, 0));
    stats.porCarrera.forEach((item) => {
      if (item.carrera !== 'Varias carreras' && item.carrera !== 'Sin especificar') {
        map.set(item.carrera, (map.get(item.carrera) ?? 0) + item.cantidad);
      }
    });
    const entries = Array.from(map.entries());
    const totalCareerDocs = entries.reduce((acc, [, v]) => acc + v, 0);

    return entries.map(([carrera, cantidad]) => {
      const style = CAREER_STYLE_MAP[carrera] ?? {
        short: carrera,
        gradient: 'from-blue-400 to-indigo-500',
        glow: 'shadow-blue-400/40',
        badge: 'text-blue-600',
      };
      return {
        carrera,
        cantidad,
        pct: totalCareerDocs > 0 ? Math.round((cantidad / totalCareerDocs) * 100) : 0,
        ...style,
      };
    });
  }, [stats.porCarrera]);

  const maxBar = Math.max(1, ...careerSeries.map((c) => c.cantidad));

  const donutData = useMemo(() => {
    const items = [
      { label: 'Constancias', count: stats.totalConstancias, color: '#3b82f6' },
      { label: 'Informes / Oficios', count: stats.totalOficios, color: '#f59e0b' },
      { label: 'Lotes Excel (ZIP)', count: stats.totalLotes, color: '#10b981' },
      { label: 'Plantillas Libres', count: stats.totalPersonalizados, color: '#8b5cf6' },
    ];
    const total = items.reduce((acc, i) => acc + i.count, 0);
    const radius = 50;
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

  const activeDonutSegment = donutData.segments.find((s) => s.label === hoveredSegment) ?? null;

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
      {/* Encabezado del Dashboard con indicador de BD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard Ejecutivo de Emisiones</h2>
          <p className="text-xs text-slate-500">
            Pasa el cursor sobre las barras o el anillo circular para explorar métricas detalladas.
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

      {/* Accesos Rápidos de Emisión */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onQuickCreate('oficial', 'constancia')}
          className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#002b59] to-[#003b75] hover:brightness-110 text-white p-4 shadow-sm transition-all cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Nueva Constancia</p>
            <p className="text-[11px] text-blue-100/80 mt-0.5">Emitir constancia de egresado</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onQuickCreate('oficial', 'oficio')}
          className="group flex items-center gap-3 rounded-2xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 text-slate-900 p-4 shadow-2xs transition-all cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Nuevo Informe / Oficio</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Trámites y respuestas oficiales</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onQuickCreate('masivo')}
          className="group flex items-center gap-3 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-slate-900 p-4 shadow-2xs transition-all cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Lote Masivo Excel → ZIP</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Generar múltiples constancias</p>
          </div>
        </button>
      </div>

      {/* 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Constancias</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats.totalConstancias}</p>
            <p className="text-[11px] text-slate-400">Egresados individuales</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Tiempo Ahorrado</p>
            <p className="text-2xl font-extrabold text-emerald-600">{horasTexto}</p>
            <p className="text-[11px] text-slate-400">Estimado (~12 min/doc manual)</p>
          </div>
        </div>
      </div>

      {/* Dos Gráficos Estadísticos Interactivos y Luminosos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Barras Verticales Animadas por Carrera */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Emisiones por Carrera Técnica
              </h3>
              <p className="text-xs text-slate-500">
                Volumen de documentos generados por especialidad académica.
              </p>
            </div>
          </div>

          <div className="relative pt-6">
            {/* Líneas horizontales sutiles de guía */}
            <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="border-b border-dashed border-slate-200/80 w-full" />
              ))}
            </div>

            <div className="relative z-10 grid grid-cols-5 gap-3 sm:gap-5 items-end h-48 px-2">
              {careerSeries.map((item, idx) => {
                const heightPct =
                  item.cantidad > 0 ? Math.max(18, Math.round((item.cantidad / maxBar) * 100)) : 8;
                const isHovered = hoveredBar === item.carrera;
                const isDimmed = hoveredBar !== null && !isHovered;

                return (
                  <div
                    key={item.carrera}
                    onMouseEnter={() => setHoveredBar(item.carrera)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className={`relative flex flex-col items-center h-full justify-end cursor-pointer transition-opacity duration-200 ${
                      isDimmed ? 'opacity-45' : 'opacity-100'
                    }`}
                  >
                    {/* Tooltip flotante con el cursor */}
                    {isHovered && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg bg-slate-800 text-white px-2.5 py-1 text-[11px] font-semibold shadow-lg pointer-events-none">
                        {item.carrera}: {item.cantidad} ({item.pct}%)
                      </div>
                    )}

                    <span
                      className={`text-xs font-extrabold mb-1.5 transition-transform duration-200 ${
                        isHovered ? `scale-125 ${item.badge}` : 'text-slate-700'
                      }`}
                    >
                      {item.cantidad}
                    </span>

                    <div className="w-full max-w-[48px] h-32 flex items-end justify-center">
                      <div
                        className={`chart-bar-enter w-full rounded-t-xl transition-all duration-300 ${
                          item.cantidad > 0
                            ? `bg-gradient-to-t ${item.gradient} shadow-md ${
                                isHovered ? `scale-x-110 -translate-y-1 shadow-lg ${item.glow}` : ''
                              }`
                            : `bg-slate-100 ${isHovered ? 'bg-slate-200 scale-x-105' : ''}`
                        }`}
                        style={{
                          height: chartsAnimated ? `${heightPct}%` : '4%',
                          animationDelay: `${idx * 70}ms`,
                        }}
                      />
                    </div>

                    <span
                      className={`mt-2 text-[11px] font-semibold text-center leading-tight truncate w-full transition-colors ${
                        isHovered ? 'text-slate-900 font-bold' : 'text-slate-600'
                      }`}
                      title={item.carrera}
                    >
                      {item.short}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Donut Interactivo con Colores Luminosos */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              Distribución por Tipo de Documento
            </h3>
            <p className="text-xs text-slate-500">
              Pasa el cursor por los segmentos o leyenda para ver el detalle.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
            {/* SVG Donut Interactivo */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90 overflow-visible">
                <circle
                  cx="65"
                  cy="65"
                  r={donutData.radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="15"
                />
                {donutData.total > 0 &&
                  donutData.segments.map((seg) => {
                    if (seg.count === 0) return null;
                    const isActive = hoveredSegment === seg.label;
                    const isDimmed = hoveredSegment !== null && !isActive;

                    return (
                      <circle
                        key={seg.label}
                        cx="65"
                        cy="65"
                        r={donutData.radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={isActive ? 20 : 15}
                        strokeDasharray={
                          chartsAnimated
                            ? `${seg.dash} ${seg.gap}`
                            : `0 ${donutData.circumference}`
                        }
                        strokeDashoffset={seg.offset}
                        strokeLinecap="butt"
                        onMouseEnter={() => setHoveredSegment(seg.label)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{
                          opacity: isDimmed ? 0.35 : 1,
                          filter: isActive ? `drop-shadow(0 0 6px ${seg.color}66)` : 'none',
                          transition:
                            'stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1), stroke-width 200ms ease, opacity 200ms ease',
                        }}
                        className="cursor-pointer"
                      />
                    );
                  })}
              </svg>

              {/* Texto central dinámico al pasar el cursor */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-2xl font-extrabold text-slate-900 leading-none transition-all">
                  {activeDonutSegment ? `${activeDonutSegment.pct}%` : donutData.total}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1 leading-tight">
                  {activeDonutSegment ? activeDonutSegment.label : 'Total Docs'}
                </span>
              </div>
            </div>

            {/* Leyenda interactiva */}
            <div className="w-full space-y-1.5">
              {donutData.segments.map((seg) => {
                const isActive = hoveredSegment === seg.label;
                return (
                  <div
                    key={seg.label}
                    onMouseEnter={() => setHoveredSegment(seg.label)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className={`flex items-center justify-between text-xs gap-2 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isActive ? 'bg-slate-100 scale-[1.02] shadow-2xs' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 transition-transform ${
                          isActive ? 'scale-125' : ''
                        }`}
                        style={{ backgroundColor: seg.color }}
                      />
                      <span
                        className={`truncate ${
                          isActive ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'
                        }`}
                      >
                        {seg.label}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 whitespace-nowrap">
                      {seg.count}{' '}
                      <span className="text-slate-400 font-normal">({seg.pct}%)</span>
                    </span>
                  </div>
                );
              })}
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
