import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from 'docx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { ConstanciaData, OficioData } from '../types/documents.ts';
import { INSTITUTION_INFO } from '../data/institutional.ts';
import {
  buildOficioHeaderCode,
  extractDocxTags,
  formatInstitutionalDate,
  getGenderAgreement,
} from './documentLogic.ts';

let cachedAssets: { insignia: Uint8Array; logoText: Uint8Array } | null = null;

async function loadInstitutionalAssets(): Promise<{ insignia: Uint8Array; logoText: Uint8Array } | null> {
  if (cachedAssets) return cachedAssets;
  try {
    const [insRes, logoRes] = await Promise.all([
      fetch('/img/insignia-lasalle.png'),
      fetch('/img/logo-lasalle.png'),
    ]);
    if (!insRes.ok || !logoRes.ok) return null;
    const [insBuf, logoBuf] = await Promise.all([insRes.arrayBuffer(), logoRes.arrayBuffer()]);
    cachedAssets = {
      insignia: new Uint8Array(insBuf),
      logoText: new Uint8Array(logoBuf),
    };
    return cachedAssets;
  } catch {
    return null;
  }
}

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

async function buildOfficialHeader(anioOficial: string): Promise<Header> {
  const assets = await loadInstitutionalAssets();

  const headerChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: INSTITUTION_INFO.tipo,
          bold: true,
          size: 36,
          font: 'Georgia',
          color: '111827',
        }),
      ],
    }),
  ];

  if (assets) {
    headerChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new ImageRun({
                        data: assets.insignia,
                        transformation: { width: 78, height: 78 },
                        type: 'png',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 72, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    indent: { left: 160 },
                    children: [
                      new ImageRun({
                        data: assets.logoText,
                        transformation: { width: 275, height: 72 },
                        type: 'png',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40 },
                    children: [
                      new TextRun({
                        text: INSTITUTION_INFO.resolucion,
                        bold: true,
                        size: 17,
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  } else {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${INSTITUTION_INFO.nombreCorto} — ${INSTITUTION_INFO.resolucion}`,
            bold: true,
            size: 20,
            font: 'Arial',
          }),
        ],
      }),
    );
  }

  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 12, color: '002B59', space: 4 },
      },
      children: [],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 120 },
      children: [
        new TextRun({
          text: anioOficial || INSTITUTION_INFO.lemaAnual,
          size: 18,
          font: 'Arial',
          color: '1F2937',
        }),
      ],
    }),
  );

  return new Header({ children: headerChildren });
}

function buildOfficialFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.DOUBLE, size: 12, color: '002B59', space: 4 },
        },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: `${INSTITUTION_INFO.direccionPie}          |          Cel. ${INSTITUTION_INFO.celular}`,
            bold: true,
            italics: true,
            size: 18,
            font: 'Georgia',
            color: '111827',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: INSTITUTION_INFO.carrerasPie,
            italics: true,
            size: 18,
            font: 'Georgia',
            color: '1F2937',
          }),
        ],
      }),
    ],
  });
}

function buildSignatureBlock(directoraNombre: string, directoraCargo: string): Paragraph[] {
  const firmaDisplay = directoraNombre.toUpperCase().startsWith('MG.')
    ? directoraNombre.toUpperCase()
    : `MG. ${directoraNombre.toUpperCase()}`;

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 850, after: 40 },
      children: [
        new TextRun({
          text: '________________________________________',
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: firmaDisplay,
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: directoraCargo.toUpperCase(),
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
  ];
}

/**
 * Genera el archivo Word (.docx) oficial de CONSTANCIA DE EGRESADO
 * replicando la estructura institucional de la IESP San Juan Bautista La Salle.
 */
export async function buildConstanciaDocxBlob(data: ConstanciaData): Promise<Blob> {
  const header = await buildOfficialHeader(data.anioOficial);
  const footer = buildOfficialFooter();
  const gender = getGenderAgreement(data.tratamiento);
  const fechaFormateada = formatInstitutionalDate(data.fechaEmision, INSTITUTION_INFO.ciudad);

  const doc = new Document({
    title: `Constancia de Egresado - ${data.apellidosNombres}`,
    creator: INSTITUTION_INFO.nombreCompleto,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 2300,
              bottom: 1400,
              left: 1440,
              right: 1440,
              header: 500,
              footer: 500,
            },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 420 },
            children: [
              new TextRun({
                text: 'CONSTANCIA DE EGRESADO',
                bold: true,
                size: 36,
                font: 'Arial',
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 380, after: 280 },
            children: [
              new TextRun({
                text: `La que suscribe, ${data.directoraNombre}, directora del ${INSTITUTION_INFO.nombreCompleto}, con RUC ${INSTITUTION_INFO.ruc} y con domicilio en el ${INSTITUTION_INFO.direccion}, de esta ciudad de ${INSTITUTION_INFO.ciudad}.`,
                size: 24,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 120, after: 220 },
            children: [
              new TextRun({
                text: 'HACE CONSTAR QUE:',
                bold: true,
                size: 24,
                font: 'Arial',
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 380, after: 280 },
            children: [
              new TextRun({
                text: `Que ${gender.articulo} ${data.tratamiento} `,
                size: 24,
                font: 'Arial',
              }),
              new TextRun({
                text: data.apellidosNombres.toUpperCase(),
                bold: true,
                size: 24,
                font: 'Arial',
              }),
              new TextRun({
                text: `, ${gender.identificado} con `,
                size: 24,
                font: 'Arial',
              }),
              new TextRun({
                text: `DNI N.° ${data.dni}`,
                bold: true,
                size: 24,
                font: 'Arial',
              }),
              new TextRun({
                text: `, ha egresado de la carrera técnica profesional de ${data.carrera}, habiendo aprobado y culminado satisfactoriamente su formación técnico-profesional en el Instituto de Educación Superior Privado San Juan Bautista – La Salle durante el semestre académico `,
                size: 24,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.semestre}.`,
                bold: true,
                size: 24,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 380, after: 440 },
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: `Se expide la presente constancia a solicitud ${gender.interesado} para los fines que estime convenientes.`,
                size: 24,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 460 },
            children: [
              new TextRun({
                text: fechaFormateada,
                size: 24,
                font: 'Arial',
              }),
            ],
          }),
          ...buildSignatureBlock(data.directoraNombre, data.directoraCargo),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * Genera el archivo Word (.docx) oficial de INFORME / OFICIO DE TRÁMITES
 * replicando el formato oficial de la IESP San Juan Bautista La Salle.
 */
export async function buildOficioDocxBlob(data: OficioData): Promise<Blob> {
  const header = await buildOfficialHeader(data.anioOficial);
  const footer = buildOfficialFooter();
  const gender = getGenderAgreement(data.tratamiento);
  const fechaFormateada = formatInstitutionalDate(data.fechaEmision, INSTITUTION_INFO.ciudad);
  const headerCode = buildOficioHeaderCode(data.tipoDocumento, data.numeroCorrelativo, data.anioNumero);

  const metaRows = [
    { label: data.destinatarioTratamiento, value: data.destinatarioNombre.toUpperCase(), bold: true },
    { label: '', value: data.destinatarioCargo, bold: true },
    { label: '', value: data.destinatarioSede, bold: true },
    { label: 'Asunto', value: data.asunto, bold: false },
    { label: 'Referencia', value: data.referencia, bold: true, underline: true },
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: metaRows.map(
      (r) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: r.label,
                      bold: Boolean(r.label),
                      size: 22,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: r.label ? ':' : '',
                      bold: true,
                      size: 22,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 76, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: r.value,
                      bold: r.bold,
                      underline: r.underline ? { type: UnderlineType.SINGLE } : undefined,
                      size: 22,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  });

  const bullets = data.tramitesCumplidos
    .filter((t) => t.trim().length > 0)
    .map(
      (tramite) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: 720 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `-   ${tramite.toUpperCase()}`,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),
    );

  const pendientesText =
    data.tramitesPendientes.length > 0
      ? data.tramitesPendientes.join(', ')
      : 'ningún trámite pendiente a la fecha';

  const doc = new Document({
    title: `${headerCode} - ${data.apellidosNombres}`,
    creator: INSTITUTION_INFO.nombreCompleto,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 2300,
              bottom: 1400,
              left: 1440,
              right: 1440,
              header: 500,
              footer: 500,
            },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: fechaFormateada,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: headerCode,
                bold: true,
                size: 23,
                font: 'Arial',
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          }),
          metaTable,
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 200, after: 160, line: 320 },
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: `Es grato dirigirme a usted por intermedio del presente para presentar un informe respecto a ${gender.tratamientoLargo} `,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: data.apellidosNombres.toUpperCase(),
                bold: true,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: `, ${gender.identificado} con `,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: `DNI N.° ${data.dni}`,
                bold: true,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: ', según se detalla a continuación:',
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 160, line: 320 },
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: `${gender.tratamientoCortoCap} `,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: data.apellidosNombres.toUpperCase(),
                bold: true,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: ` es estudiante ${gender.egresado} de la carrera técnica profesional de `,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: data.carrera.toUpperCase(),
                bold: true,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: ` por los periodos académicos comprendidos del `,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.periodoInicio} al ${data.periodoFin}.`,
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 140, line: 320 },
            children: [
              new TextRun({
                text: `Según los registros institucionales, se ha verificado que ${gender.tratamientoLargo} ha realizado los siguientes trámites y procedimientos posteriores a la culminación del sexto semestre de la C.T.P. de ${data.carrera}:`,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          ...bullets,
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 160, after: 260, line: 320 },
            indent: { firstLine: 720 },
            children: [
              new TextRun({
                text: `De lo anterior, informamos que dichos trámites y procedimientos cumplen con los requisitos para el proceso de titulación; ${gender.tratamientoCorto} `,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: data.apellidosNombres.toUpperCase(),
                bold: true,
                size: 22,
                font: 'Arial',
              }),
              new TextRun({
                text: ` ha cumplido satisfactoriamente con la parte académica, quedando pendientes, a la fecha del presente informe, los siguientes trámites: ${pendientesText}.`,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          ...buildSignatureBlock(data.directoraNombre, data.directoraCargo),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * Lee un archivo .docx personalizado subido por el usuario y detecta todas
 * las etiquetas {{variable}} dentro del documento, encabezados y pies de página.
 */
export async function extractTagsFromDocxFile(
  file: File,
): Promise<{ tags: string[]; buffer: ArrayBuffer }> {
  const buffer = await file.arrayBuffer();
  const zip = new PizZip(buffer);
  const allXmlParts: string[] = [];

  for (const filename of Object.keys(zip.files)) {
    if (/^word\/(document|header\d*|footer\d*)\.xml$/.test(filename)) {
      const content = zip.file(filename)?.asText() ?? '';
      allXmlParts.push(content);
    }
  }

  const tags = extractDocxTags(allXmlParts.join(' '));
  return { tags, buffer };
}

/**
 * Rellena una plantilla .docx personalizada usando Docxtemplater
 * conservando 100% los estilos originales del archivo subido.
 */
export function fillCustomDocxTemplate(
  buffer: ArrayBuffer,
  values: Record<string, string>,
): Blob {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });
  doc.render(values);
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Genera una plantilla .docx de ejemplo descargable con etiquetas {{...}}
 * para probar el motor universal de plantillas en 1 clic.
 */
export async function generateSampleCustomTemplateBlob(): Promise<Blob> {
  const doc = new Document({
    title: 'Plantilla Modelo con Etiquetas Automáticas',
    creator: INSTITUTION_INFO.nombreCompleto,
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'PLANTILLA MODELO CON ETIQUETAS AUTOMÁTICAS',
                bold: true,
                size: 28,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: 'CONSTANCIA / CARTA N° {{codigo_documento}}',
                bold: true,
                size: 24,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 160, line: 320 },
            children: [
              new TextRun({
                text: 'Por medio del presente documento se deja constancia que {{apellidos_nombres}}, identificado(a) con DNI N° {{dni}}, perteneciente a la carrera de {{carrera}}, ha presentado su solicitud de {{motivo_solicitud}} en la fecha {{fecha_emision}}.',
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: 'Observaciones adicionales: {{observaciones}}',
                italics: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
