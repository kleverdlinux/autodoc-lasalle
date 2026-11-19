import { useState } from 'react';
import { Download, Plus, Printer, RotateCcw, X } from 'lucide-react';
import type { OficioData, Tratamiento } from '../types/documents.ts';
import {
  DEFAULT_OFICIO,
  TRAMITES_PENDIENTES_SUGERIDOS,
  TRAMITES_TITULACION_SUGERIDOS,
} from '../data/institutional.ts';
import { isValidDni } from '../utils/documentLogic.ts';
import { CarreraInput } from './CarreraInput.tsx';

interface OficioFormProps {
  data: OficioData;
  onChange: (next: OficioData) => void;
  onDownloadDocx: () => void;
  onPrintPdf: () => void;
  isGenerating: boolean;
}

export function OficioForm({
  data,
  onChange,
  onDownloadDocx,
  onPrintPdf,
  isGenerating,
}: OficioFormProps) {
  const [nuevoTramite, setNuevoTramite] = useState('');
  const dniOk = isValidDni(data.dni);

  const update = <K extends keyof OficioData>(key: K, value: OficioData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const toggleItem = (listKey: 'tramitesCumplidos' | 'tramitesPendientes', value: string) => {
    const current = data[listKey];
    const exists = current.includes(value);
    update(
      listKey,
      exists ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const addCustomTramite = () => {
    const clean = nuevoTramite.trim().toUpperCase();
    if (!clean) return;
    if (!data.tramitesCumplidos.includes(clean)) {
      update('tramitesCumplidos', [...data.tramitesCumplidos, clean]);
    }
    setNuevoTramite('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Datos de Informe / Oficio</h2>
          <p className="text-xs text-slate-500">
            Formato oficial para Juzgados, Instituciones o respuestas de Oficios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_OFICIO })}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#002b59] px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Ejemplo
        </button>
      </div>

      {/* Numeración y fecha */}
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
          <select
            value={data.tipoDocumento}
            onChange={(e) => update('tipoDocumento', e.target.value as 'INFORME' | 'OFICIO')}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#002b59]"
          >
            <option value="INFORME">INFORME</option>
            <option value="OFICIO">OFICIO</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">N° Correlativo</label>
          <input
            type="text"
            value={data.numeroCorrelativo}
            onChange={(e) => update('numeroCorrelativo', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
          <input
            type="date"
            value={data.fechaEmision}
            onChange={(e) => update('fechaEmision', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]"
          />
        </div>
      </div>

      {/* Destinatario */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#002b59]">
          Destinatario y Referencia
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={data.destinatarioTratamiento}
            onChange={(e) =>
              update('destinatarioTratamiento', e.target.value as 'Señor(a)' | 'Señor' | 'Señora')
            }
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm bg-white"
          >
            <option value="Señor(a)">Señor(a)</option>
            <option value="Señor">Señor</option>
            <option value="Señora">Señora</option>
          </select>
          <input
            type="text"
            value={data.destinatarioNombre}
            onChange={(e) => update('destinatarioNombre', e.target.value)}
            placeholder="Nombre de la autoridad"
            className="sm:col-span-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm uppercase"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={data.destinatarioCargo}
            onChange={(e) => update('destinatarioCargo', e.target.value)}
            placeholder="Cargo / Juzgado / Institución"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <input
            type="text"
            value={data.destinatarioSede}
            onChange={(e) => update('destinatarioSede', e.target.value)}
            placeholder="Sede - Ciudad"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={data.asunto}
            onChange={(e) => update('asunto', e.target.value)}
            placeholder="Asunto"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <input
            type="text"
            value={data.referencia}
            onChange={(e) => update('referencia', e.target.value)}
            placeholder="Referencia (Oficio / Expediente)"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Estudiante */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tratamiento</label>
          <select
            value={data.tratamiento}
            onChange={(e) => update('tratamiento', e.target.value as Tratamiento)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white"
          >
            <option value="Srta.">Srta.</option>
            <option value="Sr.">Sr.</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            DNI {!dniOk && data.dni.length > 0 && <span className="text-rose-600">(8 dígitos)</span>}
          </label>
          <input
            type="text"
            maxLength={8}
            value={data.dni}
            onChange={(e) => update('dni', e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Apellidos y Nombres del Estudiante / Egresado(a)
        </label>
        <input
          type="text"
          value={data.apellidosNombres}
          onChange={(e) => update('apellidosNombres', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Carrera Técnica Profesional <span className="font-normal text-slate-400">(escribe o elige)</span>
        </label>
        <CarreraInput value={data.carrera} onChange={(val) => update('carrera', val)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Periodo Inicio</label>
          <input
            type="text"
            value={data.periodoInicio}
            onChange={(e) => update('periodoInicio', e.target.value)}
            placeholder="2022-II"
            className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Periodo Fin</label>
          <input
            type="text"
            value={data.periodoFin}
            onChange={(e) => update('periodoFin', e.target.value)}
            placeholder="2025-I"
            className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
          />
        </div>
      </div>

      {/* Trámites cumplidos */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Trámites Verificados / Cumplidos
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {TRAMITES_TITULACION_SUGERIDOS.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-slate-100"
            >
              <input
                type="checkbox"
                checked={data.tramitesCumplidos.includes(item)}
                onChange={() => toggleItem('tramitesCumplidos', item)}
                className="accent-[#002b59]"
              />
              <span className="truncate">{item}</span>
            </label>
          ))}
        </div>
        {data.tramitesCumplidos
          .filter((x) => !TRAMITES_TITULACION_SUGERIDOS.includes(x))
          .map((extra) => (
            <div
              key={extra}
              className="inline-flex items-center gap-1.5 mr-1.5 text-xs bg-blue-50 text-[#002b59] px-2.5 py-1 rounded-full border border-blue-200"
            >
              <span>{extra}</span>
              <button
                type="button"
                onClick={() => toggleItem('tramitesCumplidos', extra)}
                className="hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={nuevoTramite}
            onChange={(e) => setNuevoTramite(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTramite())}
            placeholder="Agregar otro trámite cumplido..."
            className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={addCustomTramite}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        </div>
      </div>

      {/* Trámites pendientes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Trámites Pendientes (opcional)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {TRAMITES_PENDIENTES_SUGERIDOS.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-slate-100"
            >
              <input
                type="checkbox"
                checked={data.tramitesPendientes.includes(item)}
                onChange={() => toggleItem('tramitesPendientes', item)}
                className="accent-[#002b59]"
              />
              <span className="truncate">{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={onDownloadDocx}
          disabled={isGenerating || !data.apellidosNombres.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b59] hover:bg-[#001f42] disabled:opacity-50 text-white font-semibold py-2.5 px-4 text-sm shadow transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? 'Generando Word...' : 'Descargar Word (.docx)'}
        </button>

        <button
          type="button"
          onClick={onPrintPdf}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#001b38] font-bold py-2.5 px-4 text-sm shadow transition cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>
    </div>
  );
}
