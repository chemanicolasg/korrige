import type { DeepPartial } from './index';
import type { Dict } from './es';

/** English: structure ready. Missing strings fall back to Spanish. */
export const en: DeepPartial<Dict> = {
  nav: { how: 'How it works', features: 'Features', privacy: 'Privacy', faq: 'FAQ', sales: 'Talk to sales', login: 'Sign in', demo: 'Try the demo' },
  hero: {
    kicker: 'For universities, faculties and academies',
    title: 'Grade hundreds of multiple-choice exams in minutes with the printer you already own',
  },
};
