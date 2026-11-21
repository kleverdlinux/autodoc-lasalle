import { useEffect, useRef, useState, type FormEvent } from 'react';
import Swal from 'sweetalert2';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  IdCard,
  Info,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { verifyAdminCredentials } from '../utils/documentLogic.ts';

interface LoginScreenProps {
  onLoginSuccess: (remember: boolean) => void;
  sessionExpiredMessage?: string;
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs = [330, 440, 554, 660, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i < 3 ? 'triangle' : 'sine';
      const t = ctx.currentTime + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {
    // Ignorar si el navegador bloquea reproducción automática de audio
  }
}

export function LoginScreen({ onLoginSuccess, sessionExpiredMessage }: LoginScreenProps) {
  const [usuario, setUsuario] = useState('admin');
  const [password, setPassword] = useState('admin2026');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const hasShownDemoAlert = useRef(false);

  useEffect(() => {
    if (hasShownDemoAlert.current) return;
    hasShownDemoAlert.current = true;
    void Swal.fire({
      title: 'Datos demo cargados',
      html: 'Las credenciales de prueba ya están listas en el formulario.<br><br>Solo dele clic a <strong>"Ingresar al Sistema"</strong> para acceder.',
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#002b59',
      allowOutsideClick: true,
    });
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loadingProgress !== null) return;
    if (Swal.isVisible()) Swal.close();
    setErrorMsg('');

    if (!verifyAdminCredentials(usuario, password)) {
      setErrorMsg('Usuario o contraseña incorrectos. Verifica tus credenciales institucionales.');
      return;
    }

    playSuccessChime();
    setLoadingProgress(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += Math.floor(Math.random() * 18) + 12;
      if (current >= 100) {
        current = 100;
        setLoadingProgress(100);
        window.clearInterval(timer);
        window.setTimeout(() => {
          onLoginSuccess(remember);
        }, 220);
      } else {
        setLoadingProgress(current);
      }
    }, 45);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col bg-[#f8fafc]">
      <div className="relative w-full flex-1 flex flex-col lg:flex-row bg-[#f8fafc] overflow-hidden">
        {/* FONDO AZUL MARINO CON CORTE DIAGONAL EN DESKTOP */}
        <div className="hidden lg:block absolute inset-y-0 left-0 w-[60%] z-0 pointer-events-none">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1000 1000"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="diagNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#002b59" />
                <stop offset="55%" stopColor="#002147" />
                <stop offset="100%" stopColor="#00152e" />
              </linearGradient>
            </defs>
            <polygon points="0,0 935,0 745,1000 0,1000" fill="rgba(15, 23, 42, 0.12)" />
            <polygon points="0,0 925,0 735,1000 0,1000" fill="#002b59" opacity="0.35" />
            <polygon points="0,0 905,0 715,1000 0,1000" fill="url(#diagNavyGrad)" />
            <path d="M0,0 L580,0 C420,320 350,650 0,880 Z" fill="rgba(255,255,255,0.045)" />
            <circle cx="140" cy="860" r="260" fill="rgba(0,0,0,0.16)" />
            <line
              x1="905"
              y1="0"
              x2="715"
              y2="1000"
              stroke="#f5b038"
              strokeWidth="3"
              strokeOpacity="0.65"
            />
          </svg>
        </div>

        {/* COLUMNA IZQUIERDA / ENCABEZADO EN MÓVIL */}
        <div className="relative z-10 w-full lg:w-[54%] bg-brand-gradient lg:bg-none shrink-0 pt-5 sm:pt-7 pb-10 sm:pb-14 lg:py-10 px-4 sm:px-12 lg:pl-16 xl:pl-24 lg:pr-12 flex flex-col justify-center items-center lg:items-start text-white text-center lg:text-left">
          {/* Logotipo Oficial */}
          <div className="mb-2.5 lg:mb-5">
            <div className="w-[335px] sm:w-[375px] lg:w-[430px] max-w-[92vw] bg-white py-2 px-4 lg:py-3 lg:px-5 rounded-xl sm:rounded-2xl shadow-lg border border-white/40 flex items-center justify-center">
              <img
                src="/img/logo-oficial.png"
                alt="Logo Oficial"
                className="w-full h-14 sm:h-16 lg:h-20 object-contain"
              />
            </div>
          </div>

          {/* Subtítulo con líneas doradas */}
          <div className="w-[335px] sm:w-[375px] lg:w-[430px] max-w-[92vw] flex items-center justify-between mb-1.5 lg:mb-2.5">
            <span className="flex-1 h-[1.5px] sm:h-[2px] bg-amber-300" />
            <span className="px-2.5 text-[9.5px] sm:text-[10.5px] lg:text-[12px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-amber-300 whitespace-nowrap">
              INSTITUTO DE EDUCACIÓN SUPERIOR
            </span>
            <span className="flex-1 h-[1.5px] sm:h-[2px] bg-amber-300" />
          </div>

          {/* Título Principal */}
          <h1 className="text-lg sm:text-xl lg:text-[44px] font-extrabold text-white tracking-tight leading-tight lg:leading-[1.12] mb-1 lg:mb-3.5 drop-shadow-sm">
            San Juan Bautista <span className="lg:block">La Salle</span>
          </h1>

          <p className="text-[11px] sm:text-xs lg:hidden text-blue-100/90 font-medium tracking-wide">
            Sistema de Automatización Documental Administrativa
          </p>

          <p className="hidden lg:block text-[14.5px] text-blue-50/90 leading-relaxed max-w-[465px] mb-6 font-normal">
            Plataforma integrada para la generación automatizada de constancias, informes, oficios y
            padrones administrativos institucionales.
          </p>

          {/* 3 Beneficios (Ocultos en móvil) */}
          <div className="hidden lg:block space-y-3.5 text-left w-full max-w-[460px]">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300 shrink-0 shadow-sm backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[13.5px] text-white/95 font-semibold tracking-tight leading-snug">
                Emisión instantánea de Constancias de Egresado e Informes oficiales
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300 shrink-0 shadow-sm backdrop-blur-sm">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[13.5px] text-white/95 font-semibold tracking-tight leading-snug">
                Generación automática de lotes en Word (.docx), Excel y PDF
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300 shrink-0 shadow-sm backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[13.5px] text-white/95 font-semibold tracking-tight leading-snug">
                Membrete institucional verificado y libro de emisiones correlativo
              </span>
            </div>
          </div>

          {/* Corte Diagonal para Móvil con Línea Dorada */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
            <svg viewBox="0 0 1000 50" preserveAspectRatio="none" className="w-full h-6 sm:h-8 block">
              <polygon points="0,50 1000,0 1000,50" fill="#f8fafc" />
              <line
                x1="0"
                y1="50"
                x2="1000"
                y2="0"
                stroke="#f5b038"
                strokeWidth="3"
                strokeOpacity="0.85"
              />
            </svg>
          </div>
        </div>

        {/* COLUMNA DERECHA: TARJETA DE LOGIN */}
        <div className="relative z-20 w-full lg:w-[46%] flex-1 flex flex-col justify-end lg:justify-center items-center px-0 sm:px-6 lg:pr-16 pt-0 pb-0 lg:py-10 min-h-0 bg-[#f8fafc] lg:bg-transparent">
          <div className="w-full max-w-[430px] flex-1 lg:flex-none bg-white rounded-t-[30px] sm:rounded-t-[36px] lg:rounded-[32px] px-6 sm:px-8 lg:p-10 pt-5 sm:pt-8 pb-5 sm:pb-6 shadow-2xl lg:shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border-t border-x lg:border border-slate-100/90 flex flex-col justify-center -mt-3 lg:mt-0 min-h-0">
            {/* Encabezado con ícono usuario */}
            <div className="flex flex-col items-center text-center mb-4 lg:mb-6">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-[#00264d]/[0.07] border border-[#00264d]/15 flex items-center justify-center text-[#002b59] mb-2.5 lg:mb-3.5 shadow-sm">
                <User className="w-6 h-6 lg:w-7 lg:h-7" />
              </div>
              <h2 className="font-archivo-black text-xl sm:text-2xl lg:text-[25px] text-slate-900 tracking-tight leading-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs lg:text-[13px] text-slate-500 font-medium mt-1">
                Acceso a Automatización Documental
              </p>
            </div>

            {sessionExpiredMessage && !errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-800 font-medium">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{sessionExpiredMessage}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 lg:space-y-4">
              {/* Usuario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">
                  Usuario
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center text-slate-400 pointer-events-none">
                    <IdCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ingrese su usuario"
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs sm:text-[13.5px] font-medium focus:bg-white focus:border-[#002b59] focus:ring-4 focus:ring-[#00264d]/[0.18] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    className="w-full pl-10 sm:pl-11 pr-11 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs sm:text-[13.5px] font-medium focus:bg-white focus:border-[#002b59] focus:ring-4 focus:ring-[#00264d]/[0.18] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Mostrar u ocultar contraseña"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Recordarme + Olvidó contraseña */}
              <div className="flex items-center justify-between pt-1 text-[11px] sm:text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#002b59] cursor-pointer"
                  />
                  <span>Recordarme</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-bold text-[#002b59] hover:underline cursor-pointer"
                >
                  ¿Olvidó contraseña?
                </button>
              </div>

              {/* Botón Principal */}
              <button
                type="submit"
                disabled={loadingProgress !== null}
                className="w-full py-3.5 sm:py-4 px-5 rounded-xl sm:rounded-2xl btn-brand-action text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
              >
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Pie de derechos */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 leading-relaxed">
              <p>
                © {new Date().getFullYear()}{' '}
                <strong className="text-slate-700 font-bold">San Juan Bautista La Salle</strong>.
              </p>
              <p>Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay al iniciar sesión */}
      {loadingProgress !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md transition-opacity"
          style={{ background: 'rgba(0, 21, 46, 0.88)' }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 48 48"
            fill="none"
            style={{ animation: 'spinRing 0.85s linear infinite' }}
            className="mb-3"
          >
            <circle cx="24" cy="24" r="20" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="4" />
            <path
              d="M44 24 A20 20 0 0 0 24 4"
              stroke="#f5b038"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-white text-xl font-bold">{loadingProgress}%</p>
        </div>
      )}

      {/* Modal ¿Olvidó contraseña? */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-[#002b59] flex items-center justify-center">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Recuperación de Contraseña</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Por seguridad institucional, comuníquese con el Administrador o Secretaría Académica
              para restablecer sus credenciales.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full rounded-xl bg-[#002b59] hover:bg-[#001f42] text-white font-semibold py-2.5 text-sm cursor-pointer inline-flex items-center justify-center"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
