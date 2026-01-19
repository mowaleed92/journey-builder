import { createContext, useContext, ReactNode } from 'react';
import { useTranslation as useI18nTranslation, type Locale } from '../lib/i18n';

interface RTLContextType {
  direction: 'rtl' | 'ltr';
  isRTL: boolean;
  primaryLanguage: string;
  locale: Locale;
  t: (key: string) => string;
  // Utility classes for RTL-aware layouts
  textAlign: string;
  flexDirection: string;
  marginStart: string;
  marginEnd: string;
  paddingStart: string;
  paddingEnd: string;
}

const RTLContext = createContext<RTLContextType>({
  direction: 'ltr',
  isRTL: false,
  primaryLanguage: 'en',
  locale: 'en',
  t: (key: string) => key,
  textAlign: 'text-left',
  flexDirection: 'flex-row',
  marginStart: 'ml',
  marginEnd: 'mr',
  paddingStart: 'pl',
  paddingEnd: 'pr',
});

interface RTLProviderProps {
  direction?: 'rtl' | 'ltr';
  primaryLanguage?: string;
  locale?: Locale;
  children: ReactNode;
}

export function RTLProvider({ 
  direction: propDirection, 
  primaryLanguage: propLanguage, 
  locale: propLocale,
  children 
}: RTLProviderProps) {
  // Determine locale (defaults to Arabic for user-facing)
  const locale = propLocale || 'ar';
  
  // Get translation function from i18n
  const { t, dir: i18nDir, isRTL: i18nIsRTL } = useI18nTranslation(locale);
  
  // Use prop direction if provided, otherwise use i18n direction
  const direction = propDirection || i18nDir;
  const isRTL = direction === 'rtl';
  const primaryLanguage = propLanguage || (locale === 'ar' ? 'ar' : 'en');

  const value: RTLContextType = {
    direction,
    isRTL,
    primaryLanguage,
    locale,
    t,
    // Utility classes that flip based on direction
    textAlign: isRTL ? 'text-right' : 'text-left',
    flexDirection: isRTL ? 'flex-row-reverse' : 'flex-row',
    marginStart: isRTL ? 'mr' : 'ml',
    marginEnd: isRTL ? 'ml' : 'mr',
    paddingStart: isRTL ? 'pr' : 'pl',
    paddingEnd: isRTL ? 'pl' : 'pr',
  };

  return (
    <RTLContext.Provider value={value}>
      <div dir={direction} lang={locale} className={isRTL ? 'font-arabic' : ''}>
        {children}
      </div>
    </RTLContext.Provider>
  );
}

export function useRTL() {
  return useContext(RTLContext);
}

// Convenience hook for just getting the translation function
export function useTranslation() {
  const { t, locale } = useContext(RTLContext);
  return { t, locale };
}

// Utility function to get RTL-aware class
export function rtlClass(baseClass: string, isRTL: boolean) {
  const rtlMappings: Record<string, string> = {
    'text-left': 'text-right',
    'text-right': 'text-left',
    'ml-': 'mr-',
    'mr-': 'ml-',
    'pl-': 'pr-',
    'pr-': 'pl-',
    'left-': 'right-',
    'right-': 'left-',
    'flex-row': 'flex-row-reverse',
    'space-x-': 'space-x-reverse ',
    'rounded-l-': 'rounded-r-',
    'rounded-r-': 'rounded-l-',
    'border-l-': 'border-r-',
    'border-r-': 'border-l-',
  };

  if (!isRTL) return baseClass;

  let result = baseClass;
  for (const [ltr, rtl] of Object.entries(rtlMappings)) {
    if (baseClass.includes(ltr)) {
      result = result.replace(new RegExp(ltr, 'g'), rtl);
    }
  }

  return result;
}
