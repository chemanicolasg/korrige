import { ENABLED_LOCALES, LOCALE_NAMES, Locale } from '../i18n';
import { appLocale, setAppLocale, tr } from '../i18n/app';

/** Selector de idioma de la aplicación (castellano, catalán, inglés). Al cambiar, recarga la página. */
export function LangSelect({ className = '' }: { className?: string }) {
  return (
    <select aria-label={tr('Idioma')} data-testid="app-lang" className={`rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm ${className}`} value={appLocale()} onChange={(e) => setAppLocale(e.target.value as Locale)}>
      {ENABLED_LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
