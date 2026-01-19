import { ar } from '../locales/ar';
import { en } from '../locales/en';

export type Locale = 'ar' | 'en';
export type Translations = typeof ar;

const translations: Record<Locale, Translations> = {
  ar,
  en,
};

// Get a nested value from an object using dot notation
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Return the key if not found
    }
  }
  
  return typeof current === 'string' ? current : path;
}

// Translation function
export function t(key: string, locale: Locale = 'ar'): string {
  const translation = translations[locale];
  return getNestedValue(translation, key);
}

// Hook for using translations in components
export function useTranslation(locale: Locale = 'ar') {
  return {
    t: (key: string) => t(key, locale),
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    isRTL: locale === 'ar',
  };
}
