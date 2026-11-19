import { Download, Printer, RotateCcw } from 'lucide-react';
import type { ConstanciaData, Tratamiento } from '../types/documents.ts';
import { DEFAULT_CONSTANCIA } from '../data/institutional.ts';
import { isValidDni } from '../utils/documentLogic.ts';
import { CarreraInput } from './CarreraInput.tsx';

interface ConstanciaFormProps {
  data: ConstanciaData;
  onChange: (next: ConstanciaData) => void;
  onDownloadDocx: () => void;
  onPrintPdf: () => void;
  isGenerating: boolean;
}

export function ConstanciaForm({
  data,
  onChange,
  onDownloadDocx,
  onPrintPdf,
  isGenerating,
}: ConstanciaFormProps) {
  const dniOk = isValidDni(data.dni);

  const update = <K extends keyof ConstanciaData>(key: K, value: ConstanciaData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Datos de Constancia de Egresado</h2>
          <p className="text-xs text-slate-500">
            Completa los campos y la vista previa A4 se actualizará en tiempo real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CONSTANCIA })}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#002b59] px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
          title="Restaurar ejemplo oficial"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Ejemplo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tratamiento</label>
          <select
            value={data.tratamiento}
            onChange={(e) => update('tratamiento', e.target.value as Tratamiento)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#002b59]"
          >
            <option value="Srta.">Srta. (Femenino)</option>
            <option value="Sr.">Sr. (Masculino)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            DNI (8 dígitos){' '}
            {!dniOk && data.dni.length > 0 && (
              <span className="text-rose-600 font-normal ml-1">Debe tener 8 números</span>
            )}
          </label>
          <input
            type="text"
            maxLength={8}
            value={data.dni}
            onChange={(e) => update('dni', e.target.value.replace(/\D/g, ''))}
            placeholder="Ej. 75708381"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              dniOk || data.dni.length === 0
                ? 'border-slate-300 focus:ring-[#002b59]'
                : 'border-rose-400 focus:ring-rose-500'
            }`}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Apellidos y Nombres del Egresado(a)
        </label>
        <input
          type="text"
          value={data.apellidosNombres}
          onChange={(e) => update('apellidosNombres', e.target.value)}
          placeholder="APELLIDOS Y NOMBRES COMPLETOS"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#002b59]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Carrera Técnica Profesional <span className="font-normal text-slate-400">(escribe o elige)</span>
        </label>
        <CarreraInput value={data.carrera} onChange={(val) => update('carrera', val)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Semestre Académico</label>
          <input
            type="text"
            value={data.semestre}
            onChange={(e) => update('semestre', e.target.value)}
            placeholder="Ej. 2026 - I"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Emisión</label>
          <input
            type="date"
            value={data.fechaEmision}
            onChange={(e) => update('fechaEmision', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Directora / Firma</label>
        <input
          type="text"
          value={data.directoraNombre}
          onChange={(e) => update('directoraNombre', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Denominación Oficial del Año
        </label>
        <input
          type="text"
          value={data.anioOficial}
          onChange={(e) => update('anioOficial', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#002b59]"
        />
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
