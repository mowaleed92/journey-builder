import { createContext, useContext, ReactNode } from 'react';

interface RTLContextType {
  direction: 'rtl' | 'ltr';
  isRTL: boolean;
  primaryLanguage: string;
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
  textAlign: 'text-left',
  flexDirection: 'flex-row',
  marginStart: 'ml',
  marginEnd: 'mr',
  paddingStart: 'pl',
  paddingEnd: 'pr',
});

interface RTLProviderProps {
  direction: 'rtl' | 'ltr';
  primaryLanguage?: string;
  children: ReactNode;
}

export function RTLProvider({ direction, primaryLanguage = 'en', children }: RTLProviderProps) {
  const isRTL = direction === 'rtl';

  const value: RTLContextType = {
    direction,
    isRTL,
    primaryLanguage,
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
      <div dir={direction} className={isRTL ? 'font-arabic' : ''}>
        {children}
      </div>
    </RTLContext.Provider>
  );
}

export function useRTL() {
  return useContext(RTLContext);
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
