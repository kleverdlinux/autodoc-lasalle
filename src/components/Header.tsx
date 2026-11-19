import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Layers,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export type ActiveTab = 'oficial' | 'masivo' | 'plantillas' | 'dashboard' | 'auditoria';

interface HeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  historyCount: number;
  auditCount: number;
  onLogout: () => void;
}

export function Header({
  activeTab,
  onChangeTab,
  historyCount,
  auditCount,
  onLogout,
}: HeaderProps) {
  const tabs: { id: ActiveTab; label: string; icon: typeof FileText; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: historyCount },
    { id: 'oficial', label: 'Generador', icon: FileText },
    { id: 'masivo', label: 'Lote Excel', icon: FileSpreadsheet },
    { id: 'plantillas', label: 'Plantillas', icon: Layers },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck, badge: auditCount },
  ];

  return (
    <header className="no-print sticky top-0 z-30 bg-[#002b59] text-white shadow-lg border-b-4 border-[#f5b038]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2.5 gap-3">
          {/* Identidad institucional */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-inner flex items-center justify-center shrink-0">
                <img
                  src="/img/insignia-lasalle.png"
                  alt="Insignia San Juan Bautista La Salle"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="leading-tight">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight whitespace-nowrap">
                  AutoDoc <span className="text-[#f5b038]">La Salle</span>
                </h1>
                <p className="text-[11px] text-slate-300 whitespace-nowrap">
                  IESP San Juan Bautista La Salle
                </p>
              </div>
            </div>

            {/* Botón Salir visible en móvil */}
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-200 hover:bg-rose-500/20 hover:text-white border border-white/15 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>

          {/* Navegación principal + Botón Salir en una sola fila */}
          <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible">
            <nav
              className="flex items-center gap-1 sm:gap-1.5 flex-nowrap"
              aria-label="Navegación principal"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChangeTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#f5b038] text-[#001b38] shadow-sm'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                          isActive ? 'bg-[#002b59] text-white' : 'bg-white/20 text-white'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="hidden lg:flex items-center pl-2.5 ml-1 border-l border-white/15 shrink-0">
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs xl:text-[13px] font-semibold whitespace-nowrap text-amber-200 hover:bg-rose-500/20 hover:text-white border border-white/15 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
