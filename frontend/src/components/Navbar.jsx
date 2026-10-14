import { NavLink, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ToothIcon from './ToothIcon';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '../i18n/LanguageContext';

// روابط التنقل: كل عنصر فيه المسار ومفتاح الترجمة
const links = [
  { to: '/dashboard', labelKey: 'nav.dashboard' },
  { to: '/materials', labelKey: 'nav.materials' },
  { to: '/purchases', labelKey: 'nav.purchases' },
  { to: '/sales', labelKey: 'nav.sales' },
  { to: '/work-orders', labelKey: 'nav.workOrders' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // تسجيل الخروج: نطلب من السيرفر يمسح الجلسة، وبعدها نرجع لصفحة الدخول
  async function handleLogout() {
    try {
      await axiosClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      navigate('/login');
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-gradient-to-l from-teal-800 via-teal-700 to-emerald-600 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* الشعار */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
            <ToothIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-wide">{t('app.name')}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              // NavLink يعطينا isActive عشان نميّز الصفحة الحالية
              className={({ isActive }) =>
                `rounded-full px-3.5 py-1.5 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white font-semibold text-teal-800 shadow'
                    : 'text-white/90 hover:bg-white/15 hover:text-white'
                }`
              }
            >
              {t(link.labelKey)}
            </NavLink>
          ))}

          <LanguageToggle className="ms-2" />

          <button
            onClick={handleLogout}
            className="ms-2 rounded-full border border-white/50 px-3.5 py-1.5 text-sm transition-all duration-200 hover:bg-white hover:text-teal-800"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}