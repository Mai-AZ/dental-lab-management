import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

// تنسيق الأرقام: 1234.5 -> 1,234.5
const money = (n) =>
  Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

// تنسيق التاريخ: نعرض اليوم فقط بدون الوقت
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '-');

// بطاقة رقم واحد (تُستخدم للمبيعات والمشتريات وصافي الربح)
function StatCard({ title, value, valueClass = 'text-gray-900' }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{money(value)}</p>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // نجلب البيانات الثلاثة بنفس الوقت (Promise.all أسرع من طلب واحد بعد الثاني)
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, activityRes, lowStockRes] = await Promise.all([
        axiosClient.get('/dashboard/summary'),
        axiosClient.get('/dashboard/recent-activity'),
        axiosClient.get('/materials/low-stock'),
      ]);

      setSummary(summaryRes.data);
      // ?? [] تعني: لو الحقل غير موجود استخدم مصفوفة فاضية بدل ما ينهار الموقع
      setSales(activityRes.data.sales ?? activityRes.data.recentSales ?? []);
      setPurchases(
        activityRes.data.purchases ?? activityRes.data.recentPurchases ?? []
      );
      setLowStock(lowStockRes.data ?? []);
    } catch (err) {
      console.error(err);
      setError('تعذّر تحميل البيانات. تأكدي من تشغيل الباك اند ثم أعيدي المحاولة.');
    } finally {
      setLoading(false);
    }
  }

  // useEffect بمصفوفة فاضية [] = يشتغل مرة واحدة عند فتح الصفحة
  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <p className="p-6 text-gray-500">جارِ التحميل...</p>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const netProfit = summary?.netProfit ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>

      {/* 1) بطاقات الملخص */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="إجمالي المبيعات" value={summary?.totalSales} />
        <StatCard title="إجمالي المشتريات" value={summary?.totalPurchases} />
        <StatCard
          title="صافي الربح"
          value={netProfit}
          valueClass={netProfit >= 0 ? 'text-green-700' : 'text-red-600'}
        />
      </div>

      {/* 2) تنبيهات المخزون المنخفض */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-gray-900">تنبيهات المخزون</h2>
        {lowStock.length === 0 ? (
          <p className="text-sm text-gray-500">كل المواد فوق حد التنبيه.</p>
        ) : (
          <ul className="space-y-2">
            {lowStock.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded bg-red-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-red-800">{m.name}</span>
                <span className="text-red-700">
                  المتبقي {m.quantity} {m.unit} (الحد: {m.alertThreshold})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3) آخر العمليات */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">آخر 5 مبيعات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 text-start">الطبيب</th>
                  <th className="py-2 text-start">الخدمة</th>
                  <th className="py-2 text-start">السعر</th>
                  <th className="py-2 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500">
                      لا توجد مبيعات بعد.
                    </td>
                  </tr>
                )}
                {sales.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{s.doctor?.name ?? '-'}</td>
                    <td className="py-2">{s.serviceType}</td>
                    <td className="py-2">{money(s.price)}</td>
                    <td className="py-2">{formatDate(s.saleDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">آخر 5 مشتريات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 text-start">المادة</th>
                  <th className="py-2 text-start">الكمية</th>
                  <th className="py-2 text-start">الإجمالي</th>
                  <th className="py-2 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500">
                      لا توجد مشتريات بعد.
                    </td>
                  </tr>
                )}
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">
                      {p.material?.name ?? `مادة #${p.materialId}`}
                    </td>
                    <td className="py-2">{p.quantity}</td>
                    <td className="py-2">{money(p.totalPrice)}</td>
                    <td className="py-2">{formatDate(p.purchaseDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}