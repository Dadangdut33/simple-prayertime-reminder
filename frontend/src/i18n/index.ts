import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import id from './locales/id';

const resources = {
  en: {
    translation: en,
  },
  id: {
    translation: id,
  },
};

export const AVAILABLE_LANGUAGES = Object.keys(resources);
export const LANGUAGE_LABELS: Record<string, string> = {};

export function getLanguageLabel(code: string): string {
  try {
    const display = new Intl.DisplayNames([code], { type: 'language' });
    const label = display.of(code);
    return label ? label : code;
  } catch {
    return code;
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
