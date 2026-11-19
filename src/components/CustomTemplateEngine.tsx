import { useState, type ChangeEvent } from 'react';
import { saveAs } from 'file-saver';
import { CheckCircle2, Download, FileCode2, Layers, Upload } from 'lucide-react';
import type { IssuedRecord } from '../types/documents.ts';
import {
  extractTagsFromDocxFile,
  fillCustomDocxTemplate,
  generateSampleCustomTemplateBlob,
} from '../utils/docxGenerator.ts';
import type { ToastType } from './ToastContainer.tsx';

interface CustomTemplateEngineProps {
  onAddHistory: (record: Omit<IssuedRecord, 'id' | 'creadoEn'>) => void;
  onNotify: (type: ToastType, title: string, description?: string) => void;
}

export function CustomTemplateEngine({ onAddHistory, onNotify }: CustomTemplateEngineProps) {
  const [templateName, setTemplateName] = useState('');
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownloadSampleDocx = async () => {
    const blob = await generateSampleCustomTemplateBlob();
    saveAs(blob, 'Plantilla_Modelo_Etiquetas.docx');
    onNotify('info', 'Word modelo descargado', 'Incluye etiquetas {{campo}} listas para probar.');
  };

  const handleUploadTemplate = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      const result = await extractTagsFromDocxFile(file);
      setTemplateName(file.name);
      setBuffer(result.buffer);
      setTags(result.tags);
      const initial: Record<string, string> = {};
      result.tags.forEach((tag) => {
        initial[tag] = '';
      });
      setValues(initial);
      if (result.tags.length === 0) {
        setErrorMsg(
          'No se detectaron etiquetas con formato {{campo}} en el Word. Asegúrate de escribirlas entre llaves dobles.',
        );
      } else {
        onNotify(
          'success',
          `${result.tags.length} campos detectados`,
          `Plantilla cargada: ${file.name}`,
        );
      }
    } catch {
      setErrorMsg('No se pudo leer el archivo .docx. Verifica que sea un documento Word válido.');
    }
  };

  const handleGenerate = () => {
    if (!buffer) return;
    setErrorMsg('');
    try {
      const outBlob = fillCustomDocxTemplate(buffer, values);
      const base = templateName.replace(/\.docx$/i, '') || 'Documento';
      saveAs(outBlob, `${base}_Completado.docx`);
      setStatusMsg('Documento Word generado conservando el diseño y estilos originales.');
      onNotify('success', 'Plantilla Word completada', `${base}_Completado.docx descargado.`);
      onAddHistory({
        codigo: 'LIBRE-DOCX',
        tipo: 'Plantilla Personalizada',
        beneficiario: values[tags[0]] || templateName,
        dni: values['dni'] || '—',
        carrera: values['carrera'] || templateName,
        fechaEmision: new Date().toISOString().slice(0, 10),
      });
    } catch {
      setErrorMsg('Error al reemplazar variables. Verifica que no existan llaves sin cerrar en la plantilla.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#002b59]" />
              Motor Universal de Plantillas Word (.docx)
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Sube cualquier plantilla institucional en Word con etiquetas{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-[#002b59]">
                {'{{nombre_campo}}'}
              </code>{' '}
              y la web detectará los campos automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadSampleDocx}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 text-sm transition cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 text-[#002b59]" /> Descargar Word Modelo
          </button>
        </div>

        <div className="mt-5">
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#002b59] bg-slate-50/70 hover:bg-blue-50/40 p-8 transition cursor-pointer">
            <Upload className="w-8 h-8 text-[#002b59] mb-2" />
            <span className="text-sm font-semibold text-slate-800">
              {templateName
                ? `Plantilla activa: ${templateName}`
                : 'Sube cualquier archivo Word (.docx) con etiquetas {{campo}}'}
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Conserva logos, tablas, márgenes y fuentes originales sin desconfigurar nada
            </span>
            <input type="file" accept=".docx" onChange={handleUploadTemplate} className="hidden" />
          </label>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <FileCode2 className="w-4 h-4 text-[#002b59]" />
              <span>Campos detectados automáticamente ({tags.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tags.map((tag) => (
                <div key={tag}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">
                    {tag.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={values[tag] ?? ''}
                    onChange={(e) => setValues({ ...values, [tag]: e.target.value })}
                    placeholder={`Ingresa ${tag}...`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#002b59]"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b59] hover:bg-[#001f42] text-white font-semibold px-5 py-2.5 text-sm shadow transition cursor-pointer"
              >
                <Download className="w-4 h-4" /> Rellenar y Descargar Word (.docx)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomTemplateEngine;
