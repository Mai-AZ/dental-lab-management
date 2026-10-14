import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="p-8 text-center">
      <h1 className="text-5xl font-bold text-slate-800">404</h1>
      <p className="mt-2 text-slate-600">{t('notFound.message')}</p>
      <Link
        to="/dashboard"
        className="mt-4 inline-block rounded-xl bg-teal-600 px-5 py-2 font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow"
      >
        {t('notFound.back')}
      </Link>
    </div>
  );
}
