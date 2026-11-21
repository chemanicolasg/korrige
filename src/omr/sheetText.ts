/**
 * Textos impresos en la hoja de respuestas, por idioma. Solo cambia el texto:
 * la geometría (burbujas, marcas, QR) es la misma, así que el lector no depende del idioma.
 */
export type SheetLang = 'es' | 'ca' | 'en';
export const SHEET_LANGS: SheetLang[] = ['es', 'ca', 'en'];
export const SHEET_LANG_NAMES: Record<SheetLang, string> = { es: 'Castellano', ca: 'Català', en: 'English' };

export interface SheetText {
  defaultSubtitle: string;
  exam: string;
  page: (n: number, total: number) => string;
  warning: string;
  /** Las tres líneas manuscritas de la cabecera. */
  fields: [string, string, string];
  idTitle: (label: string) => string;
  idHint: string;
  model: string;
  instructions: string;
  /** Líneas de las instrucciones (las dos vacías dejan sitio al dibujo «correcto / incorrecto»). */
  lines: [string, string, '', '', string, string, string, string];
  right: string;
  wrong: string;
  answers: string;
  footer: string;
  pageShort: string;
}

export const SHEET_TEXT: Record<SheetLang, SheetText> = {
  es: {
    defaultSubtitle: 'Hoja de respuestas  ·  Examen tipo test',
    exam: 'Examen',
    page: (n, t) => `Página ${n} de ${t}`,
    warning: 'no escribir en las marcas negras ni en el código QR',
    fields: ['Apellidos y nombre', 'Asignatura', 'Fecha'],
    idTitle: (l) => `NÚMERO DE IDENTIFICACIÓN (${l})`,
    idHint: 'Escribe un dígito por casilla y marca su burbuja debajo',
    model: 'MODELO DE EXAMEN',
    instructions: 'INSTRUCCIONES',
    lines: ['Usa bolígrafo azul o negro.', 'Rellena la burbuja por completo:', '', '', 'Una sola respuesta por pregunta.', 'Para corregir, usa corrector y', 'vuelve a marcar.', 'No dobles ni grapes la hoja.'],
    right: 'Correcto',
    wrong: 'Incorrecto',
    answers: 'RESPUESTAS',
    footer: 'Hoja de respuestas',
    pageShort: 'pág.',
  },
  ca: {
    defaultSubtitle: 'Full de respostes  ·  Examen tipus test',
    exam: 'Examen',
    page: (n, t) => `Pàgina ${n} de ${t}`,
    warning: 'no escriviu sobre les marques negres ni sobre el codi QR',
    fields: ['Cognoms i nom', 'Assignatura', 'Data'],
    idTitle: (l) => `NÚMERO D'IDENTIFICACIÓ (${l})`,
    idHint: 'Escriu un dígit per casella i marca la bombolla de sota',
    model: "MODEL D'EXAMEN",
    instructions: 'INSTRUCCIONS',
    lines: ['Fes servir bolígraf blau o negre.', 'Omple la bombolla del tot:', '', '', 'Una sola resposta per pregunta.', 'Per corregir, usa corrector i', 'torna a marcar.', 'No dobleguis ni grapis el full.'],
    right: 'Correcte',
    wrong: 'Incorrecte',
    answers: 'RESPOSTES',
    footer: 'Full de respostes',
    pageShort: 'pàg.',
  },
  en: {
    defaultSubtitle: 'Answer sheet  ·  Multiple-choice exam',
    exam: 'Exam',
    page: (n, t) => `Page ${n} of ${t}`,
    warning: 'do not write on the black marks or the QR code',
    fields: ['Full name', 'Subject', 'Date'],
    idTitle: (l) => `IDENTIFICATION NUMBER (${l})`,
    idHint: 'Write one digit per box and fill in its bubble below',
    model: 'EXAM VERSION',
    instructions: 'INSTRUCTIONS',
    lines: ['Use a blue or black pen.', 'Fill in the bubble completely:', '', '', 'Only one answer per question.', 'To change an answer, use', 'correction fluid and mark again.', 'Do not fold or staple the sheet.'],
    right: 'Correct',
    wrong: 'Incorrect',
    answers: 'ANSWERS',
    footer: 'Answer sheet',
    pageShort: 'p.',
  },
};

export const sheetLang = (lang: unknown): SheetLang => (lang === 'ca' || lang === 'en' ? lang : 'es');
