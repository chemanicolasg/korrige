import type { DeepPartial } from './index';
import type { Dict } from './es';

/** Català: estructura preparada. Lo que falte se muestra en español. */
export const ca: DeepPartial<Dict> = {
  nav: { how: 'Com funciona', features: 'Funcionalitats', privacy: 'Privacitat', faq: 'Preguntes freqüents', sales: 'Parlar amb vendes', login: 'Accedir', demo: 'Provar la demo' },
  hero: {
    kicker: 'Per a universitats, facultats i acadèmies',
    title: 'Corregeix centenars d’exàmens tipus test en minuts amb la impressora que ja tens',
  },
};
