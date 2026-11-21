/** Une los diccionarios de la aplicación. Cada módulo cubre un grupo de pantallas (ver docs/i18n.md). */
import * as account from './account';
import * as exams from './exams';
import * as lib from './lib';
import * as org from './org';
import * as results from './results';
import * as shell from './shell';
import * as upload from './upload';

const modules = [lib, shell, account, exams, upload, results, org];

export const APP_DICTS: Record<'ca' | 'en', Record<string, string>> = {
  ca: Object.assign({}, ...modules.map((m) => m.ca)),
  en: Object.assign({}, ...modules.map((m) => m.en)),
};
