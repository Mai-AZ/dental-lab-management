import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../i18n/LanguageContext';

// تنسيق الأرقام حسب اللغة (أرقام لاتينية بالحالتين): 1234.5 -> 1,234.5
const money = (n, locale) =>
  Number(n || 0).toLocaleString(locale, { maximumFractionDigits: 2 });

// تنسيق التاريخ: نعرض اليوم فقط بدون الوقت
const formatDate = (d, locale) => (d ? new Date(d).toLocaleDateString(locale) : '-');

// اسم الشهر حسب اللغة (index من 0 إلى 11). بالعربي بيطلع بالأسماء الشامية
const monthName = (index, locale) =>
  new Date(2026, index, 1).toLocaleDateString(locale, { month: 'long' });

// عدّاد يرتفع من 0 للرقم الحقيقي بحركة ناعمة
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    const start = performance.now();
    let raf;

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      // أثناء الحركة أرقام صحيحة، وبالنهاية الرقم الدقيق
      setVal(p < 1 ? Math.round(end * eased) : end);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

// أيقونات صغيرة (SVG)
const ICONS = {
  cash: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  cart: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
  chart:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  warn: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
};

function Icon({ name, className = 'h-6 w-6' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// بطاقة رقم واحد (تُستخدم للمبيعات والمشتريات وصافي الربح)
function StatCard({ title, value, icon, tone, valueClass = 'text-gray-900', delay = 0 }) {
  const { locale } = useLanguage();
  const animated = useCountUp(value);

  return (
    <div
      className="fade-up group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 ${tone}`}
        >
          <Icon name={icon} className="h-6 w-6" />
        </span>
      </div>
      <p className={`mt-3 text-3xl font-bold tracking-tight ${valueClass}`}>
        {money(animated, locale)}
      </p>
    </div>
  );
}

// غلاف موحّد للأقسام (كرت أبيض بعنوان)
function Section({ title, children, delay = 0 }) {
  return (
    <section
      className="fade-up rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="mb-4 text-base font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { t, locale } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  // نخزّن حالة الخطأ (true/false) مو النص، حتى يتبدّل النص مع اللغة
  const [error, setError] = useState(false);

  // نجلب البيانات بنفس الوقت (Promise.all أسرع من طلب واحد بعد الثاني)
  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const [summaryRes, activityRes, lowStockRes, monthlyRes] = await Promise.all([
        axiosClient.get('/dashboard/summary'),
        axiosClient.get('/dashboard/recent-activity'),
        axiosClient.get('/materials/low-stock'),
        // الرسم البياني إضافة: لو فشل ما منوقف الصفحة كلها
        axiosClient.get('/dashboard/monthly').catch(() => ({ data: [] })),
      ]);

      setSummary(summaryRes.data);
      // ?? [] تعني: لو الحقل غير موجود استخدم مصفوفة فاضية بدل ما ينهار الموقع
      setSales(activityRes.data.recentSales ?? []);
      setPurchases(activityRes.data.recentPurchases ?? []);

      setLowStock(lowStockRes.data ?? []);
      setMonthly(Array.isArray(monthlyRes.data) ? monthlyRes.data : []);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // useEffect بمصفوفة فاضية [] = يشتغل مرة واحدة عند فتح الصفحة
  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 p-16 text-gray-500">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <span>{t('dashboard.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p>{t('dashboard.error')}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white transition hover:bg-red-700"
          >
            {t('dashboard.retry')}
          </button>
        </div>
      </div>
    );
  }

  const netProfit = summary?.netProfit ?? 0;

  // بيانات الرسم: نحوّل رقم الشهر لاسمه حسب اللغة
  const chartData = monthly.map((m) => ({
    name: Number.isInteger(m.month) && m.month >= 0 && m.month <= 11 ? monthName(m.month, locale) : m.key,
    sales: m.sales,
    purchases: m.purchases,
  }));
  const hasChartData = chartData.some((d) => d.sales > 0 || d.purchases > 0);

  const todayText = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const thFirst = 'rounded-s-lg px-3 py-2 text-start font-medium';
  const thMid = 'px-3 py-2 text-start font-medium';
  const thLast = 'rounded-e-lg px-3 py-2 text-start font-medium';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-10">
      <div className="fade-up">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{todayText}</p>
      </div>

      {/* 1) بطاقات الملخص */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t('dashboard.totalSales')}
          value={summary?.totalSales}
          icon="cash"
          tone="bg-teal-50 text-teal-700"
          delay={50}
        />
        <StatCard
          title={t('dashboard.totalPurchases')}
          value={summary?.totalPurchases}
          icon="cart"
          tone="bg-amber-50 text-amber-600"
          delay={130}
        />
        <StatCard
          title={t('dashboard.netProfit')}
          value={netProfit}
          icon="chart"
          tone={netProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}
          valueClass={netProfit >= 0 ? 'text-green-700' : 'text-red-600'}
          delay={210}
        />
      </div>

      {/* 2) الرسم البياني: آخر 6 أشهر */}
      <Section title={t('dashboard.chartTitle')} delay={260}>
        {hasChartData ? (
          // الرسم دايماً من اليسار لليمين حتى ما تنعكس المحاور
          <div dir="ltr" className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => money(v, locale)}
                  width={70}
                />
                <Tooltip
                  formatter={(v, name) => [money(v, locale), name]}
                  cursor={{ fill: 'rgba(15,118,110,0.06)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="sales" name={t('dashboard.salesSeries')} fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="purchases" name={t('dashboard.purchasesSeries')} fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            {t('dashboard.noChartData')}
          </p>
        )}
      </Section>

      {/* 3) تنبيهات المخزون المنخفض */}
      <Section title={t('dashboard.stockAlerts')} delay={320}>
        {lowStock.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {t('dashboard.stockOk')}
          </p>
        ) : (
          <ul className="space-y-2">
            {lowStock.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-red-800">
                  <Icon name="warn" className="h-5 w-5" />
                  {m.name}
                </span>
                <span className="text-red-700">
                  {t('dashboard.remaining', {
                    qty: money(m.quantity, locale),
                    unit: m.unit,
                    threshold: money(m.alertThreshold, locale),
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 4) آخر العمليات */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t('dashboard.recentSales')} delay={380}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className={thFirst}>{t('dashboard.doctor')}</th>
                  <th className={thMid}>{t('dashboard.service')}</th>
                  <th className={thMid}>{t('dashboard.price')}</th>
                  <th className={thLast}>{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-gray-500">
                      {t('dashboard.noSales')}
                    </td>
                  </tr>
                )}
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 transition-colors last:border-0 hover:bg-teal-50/60"
                  >
                    <td className="px-3 py-2.5">{s.doctor?.name ?? '-'}</td>
                    <td className="px-3 py-2.5">{s.serviceType}</td>
                    <td className="px-3 py-2.5 font-medium text-teal-700">{money(s.price, locale)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{formatDate(s.saleDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={t('dashboard.recentPurchases')} delay={440}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className={thFirst}>{t('dashboard.material')}</th>
                  <th className={thMid}>{t('dashboard.quantity')}</th>
                  <th className={thMid}>{t('dashboard.total')}</th>
                  <th className={thLast}>{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-gray-500">
                      {t('dashboard.noPurchases')}
                    </td>
                  </tr>
                )}
                {purchases.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 transition-colors last:border-0 hover:bg-amber-50/60"
                  >
                    <td className="px-3 py-2.5">
                      {p.material?.name ?? t('dashboard.materialFallback', { id: p.materialId })}
                    </td>
                    <td className="px-3 py-2.5">{money(p.quantity, locale)}</td>
                    <td className="px-3 py-2.5 font-medium text-amber-700">{money(p.totalPrice, locale)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{formatDate(p.purchaseDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
