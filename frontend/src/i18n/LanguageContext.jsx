import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import translations from './translations';

const STORAGE_KEY = 'lang';
const SUPPORTED = ['ar', 'en'];

const LanguageContext = createContext(null);

const getInitialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {
    // التخزين غير متاح: نكمل بالافتراضي
  }
  return 'ar';
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  // نحدّث اتجاه الصفحة ولغتها وننحفظ الاختيار
   useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = translations[lang]['app.name'];
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ما في مشكلة
    }
  }, [lang]);

  // t('key') أو t('key', { name: 'أحمد' }) للنص اللي فيه {name}
  const t = useCallback(
    (key, params) => {
      let text = translations[lang]?.[key] ?? translations.ar[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replaceAll(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      t,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      // للتواريخ والأرقام
      locale: lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB',
      toggleLang: () => setLang((l) => (l === 'ar' ? 'en' : 'ar')),
    }),
    [lang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage لازم يُستخدم داخل LanguageProvider');
  return ctx;
};