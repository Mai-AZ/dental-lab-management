import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle({ className = '' }) {
  const { t, toggleLang } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLang}
      className={`rounded-full border border-white/40 px-3 py-1 text-sm font-medium transition hover:bg-white/20 ${className}`}
    >
      {t('lang.switch')}
    </button>
  );
}
