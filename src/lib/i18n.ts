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

// Translation function with variable interpolation support
export function t(key: string, locale: Locale = 'ar', vars?: Record<string, string | number>): string {
  const translation = translations[locale];
  let result = getNestedValue(translation, key);
  
  // Replace variables like {score}, {module}, etc.
  if (vars && typeof result === 'string') {
    Object.keys(vars).forEach(varKey => {
      result = result.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(vars[varKey]));
    });
  }
  
  return result;
}

// Hook for using translations in components
export function useTranslation(locale: Locale = 'ar') {
  return {
    t: (key: string, vars?: Record<string, string | number>) => t(key, locale, vars),
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    isRTL: locale === 'ar',
  };
}
