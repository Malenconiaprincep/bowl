import { useState, useCallback, type ReactNode } from 'react';
import { locales, type Locale, type Translations } from './locales';
import { I18nContext, type I18nContextType } from './context';

// 从 localStorage 获取保存的语言设置
function getSavedLocale(): Locale {
  const saved = localStorage.getItem('bowl-locale');
  if (saved === 'zh' || saved === 'en') return saved;
  // 检测浏览器语言
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en'; // 默认英文
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('bowl-locale', newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    setLocale(newLocale);
  }, [locale, setLocale]);

  const value: I18nContextType = {
    locale,
    t: locales[locale] as Translations,
    setLocale,
    toggleLocale
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
