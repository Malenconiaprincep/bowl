import { createContext } from 'react';
import type { Translations, Locale } from './locales';

export interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const I18nContext = createContext<I18nContextType | null>(null);

