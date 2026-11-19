import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { FileSpreadsheet, Search, ShieldCheck, Trash2 } from 'lucide-react';
import type { AuditAction, AuditLogEntry } from '../types/documents.ts';
import { exportAuditToExcel } from '../utils/excelBatch.ts';
import type { ToastType } from './ToastContainer.tsx';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  onClearLogs: () => void;
  onNotify: (type: ToastType, title: string, description?: string) => void;
}

type AuditFilter = 'ALL' | 'EMISIONES' | 'ACCESOS' | 'RESPALDOS';

const ACTION_BADGES: Record<AuditAction, { label: string; style: string }> = {
  INICIO_SESION: { label: 'Inicio de Sesión', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CIERRE_SESION: { label: 'Cierre de Sesión', style: 'bg-slate-100 text-slate-700 border-slate-200' },
  EMISION_CONSTANCIA: { label: 'Emisión Constancia', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  EMISION_INFORME: { label: 'Emisión Informe/Oficio', style: 'bg-blue-50 text-[#002b59] border-blue-200' },
  EMISION_LOTE_ZIP: { label: 'Lote Masivo ZIP', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PLANTILLA_PERSONALIZADA: { label: 'Plantilla Libre', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  REIMPRESION_RESPALDO: { label: 'Reapertura Respaldo', style: 'bg-amber-100 text-amber-900 border-amber-300' },
  EXPORTACION_EXCEL: { label: 'Exportación Excel', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  RESPALDO_SISTEMA: { label: 'Respaldo / Restauración', style: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
};

export function AuditLogView({ logs, onClearLogs, onNotify }: AuditLogViewProps) {
  const [filter, setFilter] = useState<AuditFilter>('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (filter === 'EMISIONES') {
        const isEmision = [
          'EMISION_CONSTANCIA',
          'EMISION_INFORME',
          'EMISION_LOTE_ZIP',
          'PLANTILLA_PERSONALIZADA',
          'REIMPRESION_RESPALDO',
        ].includes(entry.accion);
        if (!isEmision) return false;
      } else if (filter === 'ACCESOS') {
        if (entry.accion !== 'INICIO_SESION' && entry.accion !== 'CIERRE_SESION') return false;
      } else if (filter === 'RESPALDOS') {
        if (
          entry.accion !== 'EXPORTACION_EXCEL' &&
          entry.accion !== 'RESPALDO_SISTEMA' &&
          entry.accion !== 'REIMPRESION_RESPALDO'
        ) {
          return false;
        }
      }

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        entry.detalle.toLowerCase().includes(q) ||
        entry.modulo.toLowerCase().includes(q) ||
        entry.usuario.toLowerCase().includes(q) ||
        ACTION_BADGES[entry.accion].label.toLowerCase().includes(q)
      );
    });
  }, [logs, filter, search]);

  const handleExportAudit = () => {
    if (logs.length === 0) return;
    const blob = exportAuditToExcel(logs);
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `Auditoria_AutoDoc_LaSalle_${fecha}.xlsx`);
    onNotify('success', 'Auditoría exportada a Excel', `${logs.length} eventos exportados.`);
  };

  const filterButtons: { id: AuditFilter; label: string }[] = [
    { id: 'ALL', label: 'Todos' },
    { id: 'EMISIONES', label: 'Emisiones' },
    { id: 'RESPALDOS', label: 'Respaldos' },
    { id: 'ACCESOS', label: 'Accesos' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#002b59]" />
              Auditoría y Trazabilidad del Sistema
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Registro cronológico inmutable de accesos, generación documental, exportaciones y
              respaldos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportAudit}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold px-4 py-2 text-sm shadow transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar Auditoría (.xlsx)
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-2 text-sm font-medium cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Barra de filtros y búsqueda */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filter === btn.id
                    ? 'bg-[#002b59] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar eventos de auditoría..."
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59] w-full sm:w-64"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No existen eventos de auditoría para el filtro seleccionado.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Fecha y Hora</th>
                  <th className="px-4 py-2.5 text-left">Usuario</th>
                  <th className="px-4 py-2.5 text-left">Evento</th>
                  <th className="px-4 py-2.5 text-left">Módulo</th>
                  <th className="px-4 py-2.5 text-left">Detalle de Operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLogs.map((log) => {
                  const badge = ACTION_BADGES[log.accion];
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {log.fechaHora}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{log.usuario}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs font-medium">
                        {log.modulo}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{log.detalle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogView;
