import type { ConstanciaData, DocTemplateType, OficioData } from '../types/documents.ts';
import { INSTITUTION_INFO } from '../data/institutional.ts';
import {
  buildOficioHeaderCode,
  formatInstitutionalDate,
  getGenderAgreement,
} from '../utils/documentLogic.ts';

interface DocumentPreviewA4Props {
  mode: DocTemplateType;
  constancia: ConstanciaData;
  oficio: OficioData;
}

export function DocumentPreviewA4({ mode, constancia, oficio }: DocumentPreviewA4Props) {
  const activeAnioOficial = mode === 'constancia' ? constancia.anioOficial : oficio.anioOficial;
  const directora = mode === 'constancia' ? constancia.directoraNombre : oficio.directoraNombre;
  const cargo = mode === 'constancia' ? constancia.directoraCargo : oficio.directoraCargo;
  const firmaTexto = directora.toUpperCase().startsWith('MG.')
    ? directora.toUpperCase()
    : `MG. ${directora.toUpperCase()}`;

  const genderConst = getGenderAgreement(constancia.tratamiento);
  const genderOficio = getGenderAgreement(oficio.tratamiento);

  return (
    <div className="print-only-container a4-sheet relative mx-auto w-full max-w-[780px] min-h-[1020px] bg-white shadow-xl border border-slate-200 rounded-sm p-8 sm:p-10 flex flex-col justify-between overflow-hidden">
      {/* Marca de agua institucional sutil y amplia como el formato oficial */}
      <img
        src="/img/insignia-lasalle.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] opacity-[0.045]"
      />

      <div className="relative z-10">
        {/* Encabezado Oficial proporcional al documento original */}
        <div className="text-center">
          <p className="text-2xl sm:text-[27px] font-bold tracking-tight text-slate-900 font-serif leading-tight">
            {INSTITUTION_INFO.tipo}
          </p>

          <div className="mt-1.5 flex items-center justify-center gap-4">
            <img
              src="/img/insignia-lasalle.png"
              alt="Insignia La Salle"
              className="w-[74px] h-[74px] object-contain"
            />
            <div className="flex flex-col items-center">
              <img
                src="/img/logo-lasalle.png"
                alt="San Juan Bautista La Salle"
                className="h-[62px] object-contain"
              />
              <span className="text-[11px] font-bold tracking-wide text-slate-900 mt-0.5">
                {INSTITUTION_INFO.resolucion}
              </span>
            </div>
          </div>

          <div className="mt-2 border-t-[3px] border-b-[1.5px] border-dashed border-slate-800 h-1.5" />

          <p className="mt-1.5 text-[11.5px] font-medium text-slate-800">
            {activeAnioOficial || INSTITUTION_INFO.lemaAnual}
          </p>
        </div>

        {/* Cuerpo del documento */}
        {mode === 'constancia' ? (
          <div className="mt-9 space-y-6 text-[15px] leading-[1.7] text-slate-900">
            <h2 className="text-center text-[25px] font-bold underline underline-offset-4 tracking-wide">
              CONSTANCIA DE EGRESADO
            </h2>

            <p className="text-justify">
              La que suscribe, {constancia.directoraNombre}, directora del{' '}
              {INSTITUTION_INFO.nombreCompleto}, con RUC {INSTITUTION_INFO.ruc} y con domicilio en el{' '}
              {INSTITUTION_INFO.direccion}, de esta ciudad de {INSTITUTION_INFO.ciudad}.
            </p>

            <p className="font-bold underline underline-offset-2 pt-1">HACE CONSTAR QUE:</p>

            <p className="text-justify">
              Que {genderConst.articulo} {constancia.tratamiento}{' '}
              <strong className="uppercase">{constancia.apellidosNombres || '________________'}</strong>,{' '}
              {genderConst.identificado} con{' '}
              <strong>DNI N.° {constancia.dni || '________'}</strong>, ha egresado de la carrera
              técnica profesional de {constancia.carrera}, habiendo aprobado y culminado
              satisfactoriamente su formación técnico-profesional en el Instituto de Educación
              Superior Privado San Juan Bautista – La Salle durante el semestre académico{' '}
              <strong>{constancia.semestre}</strong>.
            </p>

            <p className="text-justify indent-8">
              Se expide la presente constancia a solicitud {genderConst.interesado} para los fines
              que estime convenientes.
            </p>

            <p className="text-right pt-6 font-medium">
              {formatInstitutionalDate(constancia.fechaEmision, INSTITUTION_INFO.ciudad)}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-[13.5px] leading-[1.55] text-slate-900">
            <p className="text-right">
              {formatInstitutionalDate(oficio.fechaEmision, INSTITUTION_INFO.ciudad)}
            </p>

            <p className="font-bold underline underline-offset-4 text-[14.5px]">
              {buildOficioHeaderCode(oficio.tipoDocumento, oficio.numeroCorrelativo, oficio.anioNumero)}
            </p>

            <div className="grid grid-cols-[100px_14px_1fr] gap-y-0.5 text-[13.5px] pt-1">
              <span className="font-semibold">{oficio.destinatarioTratamiento}</span>
              <span className="font-bold">:</span>
              <div className="font-bold leading-snug">
                <p className="uppercase">{oficio.destinatarioNombre}</p>
                <p>{oficio.destinatarioCargo}</p>
                <p>{oficio.destinatarioSede}</p>
              </div>

              <span className="font-semibold">Asunto</span>
              <span className="font-bold">:</span>
              <span>{oficio.asunto}</span>

              <span className="font-semibold">Referencia</span>
              <span className="font-bold">:</span>
              <span className="font-bold underline">{oficio.referencia}</span>
            </div>

            <p className="text-justify indent-8 pt-1.5">
              Es grato dirigirme a usted por intermedio del presente para presentar un informe
              respecto a {genderOficio.tratamientoLargo}{' '}
              <strong className="uppercase">{oficio.apellidosNombres}</strong>,{' '}
              {genderOficio.identificado} con <strong>DNI N.° {oficio.dni}</strong>, según se detalla
              a continuación:
            </p>

            <p className="text-justify indent-8">
              {genderOficio.tratamientoCortoCap}{' '}
              <strong className="uppercase">{oficio.apellidosNombres}</strong> es estudiante{' '}
              {genderOficio.egresado} de la carrera técnica profesional de{' '}
              <strong className="uppercase">{oficio.carrera}</strong> por los periodos académicos
              comprendidos del <strong>{oficio.periodoInicio}</strong> al{' '}
              <strong>{oficio.periodoFin}</strong>.
            </p>

            <p className="text-justify">
              Según los registros institucionales, se ha verificado que {genderOficio.tratamientoLargo}{' '}
              ha realizado los siguientes trámites y procedimientos posteriores a la culminación del
              sexto semestre de la C.T.P. de {oficio.carrera}:
            </p>

            <ul className="pl-8 space-y-0.5 text-[13px]">
              {oficio.tramitesCumplidos.map((t) => (
                <li key={t}>- &nbsp; {t.toUpperCase()}</li>
              ))}
            </ul>

            <p className="text-justify indent-8">
              De lo anterior, informamos que dichos trámites y procedimientos cumplen con los
              requisitos para el proceso de titulación; {genderOficio.tratamientoCorto}{' '}
              <strong className="uppercase">{oficio.apellidosNombres}</strong> ha cumplido
              satisfactoriamente con la parte académica, quedando pendientes, a la fecha del presente
              informe, los siguientes trámites:{' '}
              {oficio.tramitesPendientes.length > 0
                ? oficio.tramitesPendientes.join(', ')
                : 'ningún trámite pendiente'}.
            </p>
          </div>
        )}
      </div>

      {/* Firma y Pie de página */}
      <div className="relative z-10 mt-6 space-y-5">
        <div className="text-center pt-4">
          <div className="mx-auto w-56 border-t border-slate-800 pt-1">
            <p className="text-xs font-bold tracking-wide">{firmaTexto}</p>
            <p className="text-xs font-bold">{cargo.toUpperCase()}</p>
          </div>
        </div>

        <footer className="text-center">
          <div className="border-t-[3px] border-b-[1.5px] border-dashed border-slate-800 h-1.5 mb-1.5" />
          <div className="flex flex-wrap justify-between items-center text-[11px] font-bold italic font-serif text-slate-900 px-2">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3 fill-slate-900 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              {INSTITUTION_INFO.direccionPie}
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3 fill-slate-900 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
              Cel. {INSTITUTION_INFO.celular}
            </span>
          </div>
          <p className="text-[11px] italic font-serif text-slate-800 mt-0.5">
            {INSTITUTION_INFO.carrerasPie}
          </p>
        </footer>
      </div>
    </div>
  );
}
