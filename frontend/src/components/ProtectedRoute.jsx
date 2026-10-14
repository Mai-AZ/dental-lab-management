import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Navbar from '../components/Navbar';
import { useLanguage } from '../i18n/LanguageContext';

function ProtectedRoute({ children }) {
  const { t } = useLanguage();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // السيرفر مو واصل (غير "مو مسجّل دخول")
  const [unreachable, setUnreachable] = useState(false);

  const checkAuth = () => {
    setIsChecking(true);
    setUnreachable(false);
    axiosClient
      .get('/materials')
      .then(() => setIsAuthenticated(true))
      .catch((err) => {
        setIsAuthenticated(false);
        // ما في response يعني مشكلة اتصال، مو جلسة منتهية
        if (!err.response) setUnreachable(true);
      })
      .finally(() => setIsChecking(false));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (isChecking) {
    return <div className="p-8 text-center text-slate-500">{t('auth.checking')}</div>;
  }

  if (unreachable) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p>{t('auth.unreachable')}</p>
          <button
            onClick={checkAuth}
            className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white transition hover:bg-red-700"
          >
            {t('auth.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default ProtectedRoute;
