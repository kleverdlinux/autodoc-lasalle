import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 w-[calc(100vw-2.5rem)] max-w-sm pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? {
                accent: 'bg-emerald-500',
                iconWrap: 'bg-emerald-50 text-emerald-600',
                Icon: CheckCircle2,
              }
            : toast.type === 'error'
              ? {
                  accent: 'bg-rose-500',
                  iconWrap: 'bg-rose-50 text-rose-600',
                  Icon: AlertCircle,
                }
              : {
                  accent: 'bg-[#002b59]',
                  iconWrap: 'bg-blue-50 text-[#002b59]',
                  Icon: Info,
                };

        const { Icon } = styles;

        return (
          <div
            key={toast.id}
            className="toast-enter pointer-events-auto relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/10 flex items-start gap-3 p-3.5 pr-9"
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${styles.accent}`} />
            <div
              className={`ml-1.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styles.iconWrap}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
