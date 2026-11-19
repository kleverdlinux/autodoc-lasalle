import { CARRERAS_OFICIALES } from '../data/institutional.ts';

interface CarreraInputProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

/**
 * Campo híbrido que permite escribir libremente cualquier carrera técnica
 * o seleccionar rápidamente una de las 4 carreras oficiales de La Salle.
 */
export function CarreraInput({ value, onChange, compact = false }: CarreraInputProps) {
  const isOfficial = CARRERAS_OFICIALES.some((c) => c === value);

  return (
    <div className="flex gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe o elige carrera..."
        className={
          compact
            ? 'flex-1 min-w-[140px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#002b59]'
            : 'flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]'
        }
      />
      <select
        aria-label="Seleccionar carrera oficial"
        title="Elegir de la lista oficial"
        value={isOfficial ? value : ''}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className={
          compact
            ? 'w-16 rounded-lg border border-slate-300 bg-slate-50 px-1.5 py-1.5 text-[11px] font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#002b59]'
            : 'w-24 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#002b59]'
        }
      >
        <option value="">Lista...</option>
        {CARRERAS_OFICIALES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
