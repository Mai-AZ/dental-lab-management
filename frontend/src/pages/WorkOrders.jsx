import { useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import ToothChart from '../components/ToothChart';

// تاريخ اليوم بالتوقيت المحلي بصيغة YYYY-MM-DD
// (toISOString كان يعطي تاريخ UTC، فيطلع أمس لو الوقت بعد منتصف الليل بتوقيتنا)
const today = () => new Date().toLocaleDateString('en-CA');

// نوع العمل الافتراضي بيجي من السيرفر (أول نوع بالقائمة)
const emptyForm = (defaultWorkType = '') => ({
  doctorId: '',
  teeth: [],
  workType: defaultWorkType,
  color: '',
  receivedDate: today(),
  deliveryDate: '',
});

// التواريخ مخزّنة كمنتصف ليل UTC، فنعرضها بـ UTC حتى ما ينزاح اليوم
// واسم الشهر بالحروف (مثل: 2 كانون الأول 2026) حتى ما يصير لبس بين اليوم والشهر
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('ar-SY-u-nu-latn', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [doctors, setDoctors] = useState([]);
  // أنواع الأعمال: مصدرها الوحيد السيرفر (GET /work-orders/types)
  const [workTypes, setWorkTypes] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // يمنع النقرة المزدوجة فوراً (يعني ما بينضاف العمل مرتين)
  const busyRef = useRef(false);

  const fetchOrders = async () => {
    try {
      const res = await axiosClient.get('/work-orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      setError('تعذّر تحميل الأعمال');
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await axiosClient.get('/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
      setError('تعذّر تحميل الأطباء');
    }
  };

  const fetchWorkTypes = async () => {
    try {
      const res = await axiosClient.get('/work-orders/types');
      setWorkTypes(res.data);
      // نحط أول نوع كقيمة افتراضية، بدون ما نمسح اللي اختاره المستخدم لو كان اختار
      setForm((prev) => ({ ...prev, workType: prev.workType || res.data[0] || '' }));
    } catch (err) {
      console.error(err);
      setError('تعذّر تحميل أنواع الأعمال');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDoctors();
    fetchWorkTypes();
  }, []);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const toggleTooth = (id) => {
    setForm((prev) => ({
      ...prev,
      teeth: prev.teeth.includes(id)
        ? prev.teeth.filter((t) => t !== id)
        : [...prev.teeth, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    setError('');

    if (!form.doctorId) return setError('اختر الطبيب');
    if (!form.workType) return setError('اختر نوع العمل');
    if (form.teeth.length === 0) return setError('اختر سن واحد على الأقل من المخطط');
    if (!form.receivedDate) return setError('تاريخ الاستلام مطلوب');
    if (form.deliveryDate && form.deliveryDate < form.receivedDate) {
      return setError('تاريخ التسليم لازم يكون بعد تاريخ الاستلام');
    }

    busyRef.current = true;
    setSaving(true);
    try {
      await axiosClient.post('/work-orders', {
        ...form,
        doctorId: Number(form.doctorId),
        deliveryDate: form.deliveryDate || null,
      });
      setForm(emptyForm(workTypes[0] || ''));
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء إضافة العمل');
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('متأكد من حذف هذا العمل؟')) return;
    try {
      await axiosClient.delete(`/work-orders/${id}`);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء الحذف');
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400';

  return (
    <div className="mx-auto max-w-6xl p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">سجل الأعمال</h1>

      {error && (
        <div role="alert" className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8 rounded border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">عمل جديد</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block mb-1 text-sm text-gray-700">اسم الطبيب</span>
            <select
              className={inputClass}
              value={form.doctorId}
              onChange={(e) => setField('doctorId', e.target.value)}
            >
              <option value="">اختر الطبيب</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block mb-1 text-sm text-gray-700">نوع العمل</span>
            <select
              className={inputClass}
              value={form.workType}
              onChange={(e) => setField('workType', e.target.value)}
            >
              {workTypes.length === 0 && <option value="">جاري التحميل...</option>}
              {workTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block mb-1 text-sm text-gray-700">اللون</span>
            <input
              className={inputClass}
              value={form.color}
              onChange={(e) => setField('color', e.target.value)}
              placeholder="مثال: A2"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block mb-1 text-sm text-gray-700">تاريخ الاستلام</span>
              <input
                type="date"
                className={inputClass}
                value={form.receivedDate}
                onChange={(e) => setField('receivedDate', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="block mb-1 text-sm text-gray-700">تاريخ التسليم</span>
              <input
                type="date"
                className={inputClass}
                value={form.deliveryDate}
                min={form.receivedDate}
                onChange={(e) => setField('deliveryDate', e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <span className="block mb-2 text-sm text-gray-700">
            اسم العمل (اضغط على الأسنان المطلوبة) — المختار: {form.teeth.length}
          </span>
          <div className="overflow-x-auto">
            <ToothChart selected={form.teeth} onToggle={toggleTooth} />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || workTypes.length === 0}
          className="mt-4 rounded bg-teal-700 px-5 py-2 text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ العمل'}
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-right">اسم الطبيب</th>
              <th className="px-3 py-2 text-right">اسم العمل</th>
              <th className="px-3 py-2 text-right">نوع العمل</th>
              <th className="px-3 py-2 text-right">اللون</th>
              <th className="px-3 py-2 text-right">تاريخ الاستلام</th>
              <th className="px-3 py-2 text-right">تاريخ التسليم</th>
              <th className="px-3 py-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  ما في أعمال مسجّلة لسا. أضف أول عمل من الفورم فوق.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-right">{o.doctor?.name}</td>
                <td className="px-3 py-2 text-right">
                  <ToothChart selected={o.teeth} small />
                </td>
                <td className="px-3 py-2 text-right">{o.workType}</td>
                <td className="px-3 py-2 text-right">{o.color || '—'}</td>
                <td className="px-3 py-2 text-right">{formatDate(o.receivedDate)}</td>
                <td className="px-3 py-2 text-right">{formatDate(o.deliveryDate)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}