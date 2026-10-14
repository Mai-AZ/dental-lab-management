import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ToothIcon from '../components/ToothIcon';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../i18n/LanguageContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axiosClient.post('/auth/login', { username, password });
      navigate('/dashboard');
    } catch (err) {
      if (err.response) {
        // رسالة السيرفر الحقيقية (غلط بالبيانات، أو محاولات كثيرة، ...)
        setError(err.response.data?.error || t('login.error.generic'));
      } else {
        // ما وصلنا رد: السيرفر مطفي أو لسا عم يصحى (Neon/Render)
        setError(t('login.error.network'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-900 via-teal-700 to-emerald-500 px-4">
      {/* زر تبديل اللغة */}
      <div className="absolute end-4 top-4 z-10">
        <LanguageToggle className="text-white" />
      </div>

      {/* أشكال خلفية ناعمة متحركة */}
      <div className="floaty pointer-events-none absolute -top-24 -start-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
      <div
        className="floaty pointer-events-none absolute -bottom-28 -end-20 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="floaty pointer-events-none absolute top-1/3 end-1/4 h-40 w-40 rounded-full bg-teal-200/10 blur-xl"
        style={{ animationDelay: '4s' }}
      />

      <form
        onSubmit={handleSubmit}
        className="fade-up relative w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl ring-1 ring-white/40 backdrop-blur"
      >
        {/* الشعار والعنوان */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-lg">
            <ToothIcon className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('login.subtitle')}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('login.username')}
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mb-4 w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          required
        />

        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('login.password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-6 w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-l from-teal-700 to-emerald-600 py-2.5 font-semibold text-white shadow-lg shadow-teal-700/30 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}

export default Login;