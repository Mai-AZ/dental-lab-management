import { NavLink, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

// روابط التنقل: كل عنصر فيه المسار والاسم الظاهر
const links = [
  { to: '/dashboard', label: 'لوحة التحكم' },
  { to: '/materials', label: 'المواد' },
  { to: '/purchases', label: 'المشتريات' },
  { to: '/sales', label: 'المبيعات' },
];

export default function Navbar() {
  const navigate = useNavigate();

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
    <nav className="bg-teal-700 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="text-lg font-bold">مخبر الأسنان</span>

        <div className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              // NavLink يعطينا isActive عشان نميّز الصفحة الحالية
              className={({ isActive }) =>
                `rounded px-3 py-1.5 text-sm ${
                  isActive ? 'bg-white text-teal-800 font-semibold' : 'hover:bg-teal-600'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          <button
            onClick={handleLogout}
            className="ms-2 rounded border border-white/60 px-3 py-1.5 text-sm hover:bg-teal-600"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </nav>
  );
}