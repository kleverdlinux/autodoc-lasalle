import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { Award, FileCheck2, ZoomIn } from 'lucide-react';
import type {
  AuditAction,
  AuditLogEntry,
  ConstanciaData,
  DocTemplateType,
  IssuedRecord,
  OficioData,
  SystemBackupFile,
} from './types/documents.ts';
import { DEFAULT_CONSTANCIA, DEFAULT_OFICIO } from './data/institutional.ts';
import { buildExportBaseFilename, buildOficioHeaderCode } from './utils/documentLogic.ts';
import { Header, type ActiveTab } from './components/Header.tsx';
import { ConstanciaForm } from './components/ConstanciaForm.tsx';
import { OficioForm } from './components/OficioForm.tsx';
import { DocumentPreviewA4 } from './components/DocumentPreviewA4.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { ToastContainer, type ToastItem, type ToastType } from './components/ToastContainer.tsx';

const BatchExcelGenerator = lazy(() => import('./components/BatchExcelGenerator.tsx'));
const CustomTemplateEngine = lazy(() => import('./components/CustomTemplateEngine.tsx'));
const DashboardBackups = lazy(() => import('./components/DashboardBackups.tsx'));
const AuditLogView = lazy(() => import('./components/AuditLogView.tsx'));

const STORAGE_KEY = 'autodoc_lasalle_history_v1';
const AUDIT_STORAGE_KEY = 'autodoc_lasalle_audit_v1';
const AUTH_STORAGE_KEY = 'autodoc_lasalle_auth_v1';
const APP_PAGE_TITLE = 'AutoDoc La Salle — Automatización Documental Administrativa';

type PreviewZoom = 80 | 90 | 100;
const ZOOM_LEVELS: PreviewZoom[] = [80, 90, 100];

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(AUTH_STORAGE_KEY) === 'true' ||
        sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true'
      );
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('oficial');
  const [docMode, setDocMode] = useState<DocTemplateType>('constancia');
  const [constancia, setConstancia] = useState<ConstanciaData>(DEFAULT_CONSTANCIA);
  const [oficio, setOficio] = useState<OficioData>(DEFAULT_OFICIO);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<PreviewZoom>(100);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [history, setHistory] = useState<IssuedRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as IssuedRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AuditLogEntry[]) : [];
    } catch {
      return [];
    }
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    [],
  );

  const appendAudit = useCallback((accion: AuditAction, modulo: string, detalle: string) => {
    const entry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fechaHora: new Date().toLocaleString('es-PE'),
      usuario: 'admin',
      accion,
      modulo,
      detalle,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignorar si almacenamiento local excede cuota
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch {
      // Ignorar si almacenamiento local excede cuota
    }
  }, [auditLogs]);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.title = buildExportBaseFilename(docMode, constancia, oficio);
    };
    const handleAfterPrint = () => {
      document.title = APP_PAGE_TITLE;
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [docMode, constancia, oficio]);

  const addHistoryRecord = useCallback(
    (record: Omit<IssuedRecord, 'id' | 'creadoEn'>) => {
      const newEntry: IssuedRecord = {
        ...record,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        creadoEn: new Date().toLocaleString('es-PE'),
      };
      setHistory((prev) => [newEntry, ...prev]);

      const actionMap: Record<IssuedRecord['tipo'], AuditAction> = {
        'Constancia de Egresado': 'EMISION_CONSTANCIA',
        'Informe / Oficio': 'EMISION_INFORME',
        'Lote Masivo (ZIP)': 'EMISION_LOTE_ZIP',
        'Plantilla Personalizada': 'PLANTILLA_PERSONALIZADA',
      };
      appendAudit(
        actionMap[record.tipo],
        record.tipo,
        `${record.codigo} — ${record.beneficiario} (DNI: ${record.dni}, ${record.carrera})`,
      );
    },
    [appendAudit],
  );

  const handleDownloadConstancia = async () => {
    setIsGenerating(true);
    try {
      const { buildConstanciaDocxBlob } = await import('./utils/docxGenerator.ts');
      const snapshot: ConstanciaData = { ...constancia };
      const blob = await buildConstanciaDocxBlob(snapshot);
      const baseName = buildExportBaseFilename('constancia', snapshot, oficio);
      saveAs(blob, `${baseName}.docx`);
      addHistoryRecord({
        codigo: `CONST-${new Date().getFullYear()}-${String(history.length + 1).padStart(3, '0')}`,
        tipo: 'Constancia de Egresado',
        beneficiario: snapshot.apellidosNombres.toUpperCase(),
        dni: snapshot.dni || '—',
        carrera: snapshot.carrera,
        fechaEmision: snapshot.fechaEmision,
        payload: { mode: 'constancia', data: snapshot },
      });
      pushToast('success', 'Constancia Word (.docx) generada', `${baseName}.docx`);
    } catch {
      pushToast('error', 'No se pudo generar el Word', 'Intenta nuevamente en unos segundos.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadOficio = async () => {
    setIsGenerating(true);
    try {
      const { buildOficioDocxBlob } = await import('./utils/docxGenerator.ts');
      const snapshot: OficioData = {
        ...oficio,
        tramitesCumplidos: [...oficio.tramitesCumplidos],
        tramitesPendientes: [...oficio.tramitesPendientes],
      };
      const blob = await buildOficioDocxBlob(snapshot);
      const baseName = buildExportBaseFilename('oficio', constancia, snapshot);
      saveAs(blob, `${baseName}.docx`);
      addHistoryRecord({
        codigo: buildOficioHeaderCode(
          snapshot.tipoDocumento,
          snapshot.numeroCorrelativo,
          snapshot.anioNumero,
        ),
        tipo: 'Informe / Oficio',
        beneficiario: snapshot.apellidosNombres.toUpperCase(),
        dni: snapshot.dni || '—',
        carrera: snapshot.carrera,
        fechaEmision: snapshot.fechaEmision,
        payload: { mode: 'oficio', data: snapshot },
      });
      pushToast('success', `${snapshot.tipoDocumento} Word (.docx) generado`, `${baseName}.docx`);
    } catch {
      pushToast('error', 'No se pudo generar el Word', 'Intenta nuevamente en unos segundos.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPdf = () => {
    const fileBase = buildExportBaseFilename(docMode, constancia, oficio);
    document.title = fileBase;
    const label = docMode === 'constancia' ? 'Constancia de Egresado' : 'Informe / Oficio';
    const targetName =
      docMode === 'constancia'
        ? constancia.apellidosNombres.toUpperCase()
        : oficio.apellidosNombres.toUpperCase();
    appendAudit(
      docMode === 'constancia' ? 'EMISION_CONSTANCIA' : 'EMISION_INFORME',
      `${label} (PDF)`,
      `Impresión / PDF: ${fileBase} — ${targetName}`,
    );
    pushToast('info', 'Preparando hoja A4 para impresión / PDF', `Archivo sugerido: ${fileBase}.pdf`);
    window.print();
    setTimeout(() => {
      document.title = APP_PAGE_TITLE;
    }, 500);
  };

  const handleReopenRecord = (record: IssuedRecord) => {
    if (!record.payload) return;
    if (record.payload.mode === 'constancia') {
      setConstancia({ ...record.payload.data });
      setDocMode('constancia');
    } else {
      setOficio({ ...record.payload.data });
      setDocMode('oficio');
    }
    setActiveTab('oficial');
    appendAudit(
      'REIMPRESION_RESPALDO',
      'Dashboard y Respaldos',
      `Reapertura en editor de ${record.codigo} (${record.beneficiario})`,
    );
    pushToast('info', 'Documento cargado desde respaldo', `${record.codigo} listo para editar o imprimir.`);
  };

  const handleRestoreBackup = (backup: SystemBackupFile) => {
    setHistory((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const merged = [...prev, ...backup.history.filter((item) => !existingIds.has(item.id))];
      return merged;
    });
    if (backup.auditLogs.length > 0) {
      setAuditLogs((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const merged = [...prev, ...backup.auditLogs.filter((item) => !existingIds.has(item.id))];
        return merged;
      });
    }
    appendAudit(
      'RESPALDO_SISTEMA',
      'Respaldos JSON',
      `Restauración de respaldo con ${backup.history.length} documento(s).`,
    );
    pushToast(
      'success',
      'Respaldo restaurado correctamente',
      `Se integraron los registros del archivo exportado el ${backup.exportedAt.slice(0, 10)}.`,
    );
  };

  const handleLoginSuccess = (remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      }
    } catch {
      // Ignorar si almacenamiento no está disponible
    }
    setIsAuthenticated(true);
    appendAudit('INICIO_SESION', 'Autenticación', 'Acceso exitoso al sistema administrativo.');
    pushToast('success', 'Sesión iniciada', 'Bienvenido al módulo de automatización documental.');
  };

  const handleLogout = () => {
    appendAudit('CIERRE_SESION', 'Autenticación', 'Cierre de sesión manual por el usuario.');
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignorar
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const zoomScale = previewZoom / 100;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        historyCount={history.length}
        auditCount={auditLogs.length}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:m-0 print:max-w-none">
        {activeTab === 'oficial' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block">
            {/* Panel Izquierdo: Selector de Plantilla + Formulario */}
            <section className="no-print lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDocMode('constancia')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    docMode === 'constancia'
                      ? 'bg-[#002b59] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4" /> Constancia Egresado
                </button>
                <button
                  type="button"
                  onClick={() => setDocMode('oficio')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    docMode === 'oficio'
                      ? 'bg-[#002b59] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" /> Informe / Oficio
                </button>
              </div>

              {docMode === 'constancia' ? (
                <ConstanciaForm
                  data={constancia}
                  onChange={setConstancia}
                  onDownloadDocx={handleDownloadConstancia}
                  onPrintPdf={handlePrintPdf}
                  isGenerating={isGenerating}
                />
              ) : (
                <OficioForm
                  data={oficio}
                  onChange={setOficio}
                  onDownloadDocx={handleDownloadOficio}
                  onPrintPdf={handlePrintPdf}
                  isGenerating={isGenerating}
                />
              )}
            </section>

            {/* Panel Derecho: Barra de Zoom + Vista Previa Hoja A4 Oficial */}
            <section className="lg:col-span-7">
              <div className="no-print mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
                <span>Vista previa oficial en vivo (Formato A4 — IESP La Salle)</span>

                <div
                  className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 shadow-xs"
                  role="group"
                  aria-label="Zoom de vista previa"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
                  {ZOOM_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPreviewZoom(level)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        previewZoom === level
                          ? 'bg-[#002b59] text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto pb-4 print:overflow-visible print:pb-0">
                <div
                  className="print-zoom-reset origin-top transition-transform duration-200"
                  style={
                    previewZoom !== 100
                      ? {
                          transform: `scale(${zoomScale})`,
                          marginBottom: `-${Math.round((1 - zoomScale) * 1020)}px`,
                        }
                      : undefined
                  }
                >
                  <DocumentPreviewA4 mode={docMode} constancia={constancia} oficio={oficio} />
                </div>
              </div>
            </section>
          </div>
        )}

        <Suspense
          fallback={
            <div className="max-w-4xl mx-auto py-16 text-center text-sm font-medium text-slate-500">
              Cargando módulo...
            </div>
          }
        >
          {activeTab === 'masivo' && (
            <BatchExcelGenerator onAddHistory={addHistoryRecord} onNotify={pushToast} />
          )}
          {activeTab === 'plantillas' && (
            <CustomTemplateEngine onAddHistory={addHistoryRecord} onNotify={pushToast} />
          )}
          {activeTab === 'dashboard' && (
            <DashboardBackups
              records={history}
              auditLogs={auditLogs}
              onReopenRecord={handleReopenRecord}
              onRestoreBackup={handleRestoreBackup}
              onExportBackup={() =>
                appendAudit(
                  'RESPALDO_SISTEMA',
                  'Respaldos JSON',
                  `Exportación de respaldo completo (${history.length} documentos).`,
                )
              }
              onExportExcelLog={() =>
                appendAudit(
                  'EXPORTACION_EXCEL',
                  'Dashboard y Respaldos',
                  `Exportación de Libro de Emisiones (.xlsx) con ${history.length} filas.`,
                )
              }
              onClearHistory={() => {
                setHistory([]);
                appendAudit('RESPALDO_SISTEMA', 'Dashboard y Respaldos', 'Limpieza manual del historial.');
                pushToast('info', 'Libro de emisiones limpiado');
              }}
              onNotify={pushToast}
            />
          )}
          {activeTab === 'auditoria' && (
            <AuditLogView
              logs={auditLogs}
              onClearLogs={() => {
                setAuditLogs([]);
                pushToast('info', 'Bitácora de auditoría limpiada');
              }}
              onNotify={pushToast}
            />
          )}
        </Suspense>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
