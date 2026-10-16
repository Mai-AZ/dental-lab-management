import { useLanguage } from '../i18n/LanguageContext';

// أزرار الترقيم (السابق / التالي) مع ملخص "صفحة X من Y"
// الأسهم بتنعكس تلقائياً بالعربي (rtl:rotate-180)
export default function Pagination({ page, pages, total, onChange, disabled = false }) {
  const { t, locale } = useLanguage();
  if (!total) return null;

  const num = (n) => new Intl.NumberFormat(locale).format(n);
  const btnClass =
    'inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white';
  const arrow = 'h-4 w-4 rtl:rotate-180';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        {t('pagination.summary', { page: num(page), pages: num(pages), total: num(total) })}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          className={btnClass}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={arrow} aria-hidden="true">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          {t('pagination.prev')}
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= pages}
          className={btnClass}
        >
          {t('pagination.next')}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={arrow} aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
