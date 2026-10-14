import { useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import ToothChart from '../components/ToothChart';
import { useLanguage } from '../i18n/LanguageContext';

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

export default function WorkOrders() {
  const { t, locale } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [doctors, setDoctors] = useState([]);
  // أنواع الأعمال: مصدرها الوحيد السيرفر (GET /work-orders/types)
  const [workTypes, setWorkTypes] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // يمنع النقرة المزدوجة فوراً (يعني ما بينضاف العمل مرتين)
  const busyRef = useRef(false);

  // التواريخ مخزّنة كمنتصف ليل UTC، فنعرضها بـ UTC حتى ما ينزاح اليوم
  // واسم الشهر بالحروف حتى ما يصير لبس بين اليوم والشهر
  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '—';

  // أنواع الأعمال مخزّنة بالعربي بالقاعدة، فنترجم العرض فقط.
  // إذا ما في ترجمة للنوع بنعرضه متل ما هو.
  const workTypeLabel = (value) => {
    const key = `workType.${value}`;
    const label = t(key);
    return label === key ? value : label;
  };

  const fetchOrders = async () => {
    try {
      const res = await axiosClient.get('/work-orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      setError(t('workOrders.errLoadOrders'));
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await axiosClient.get('/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
      setError(t('workOrders.errLoadDoctors'));
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
      setError(t('workOrders.errLoadTypes'));
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
        ? prev.teeth.filter((n) => n !== id)
        : [...prev.teeth, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    setError('');

    if (!form.doctorId) return setError(t('workOrders.valDoctor'));
    if (!form.workType) return setError(t('workOrders.valWorkType'));
    if (form.teeth.length === 0) return setError(t('workOrders.valTeeth'));
    if (!form.receivedDate) return setError(t('workOrders.valReceived'));
    if (form.deliveryDate && form.deliveryDate < form.receivedDate) {
      return setError(t('workOrders.valDelivery'));
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
      if (!err.response) {
        setError(t('workOrders.errNetwork'));
      } else {
        // رسائل الباك بالعربي حالياً، والبديل مترجم
        setError(err.response.data?.error || t('workOrders.errAdd'));
      }
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('workOrders.confirmDelete'))) return;
    try {
      await axiosClient.delete(`/work-orders/${id}`);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || t('workOrders.errDelete'));
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-start outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
  const labelClass = 'mb-1 block text-sm text-slate-600';
  const thClass = 'px-4 py-3 text-start text-sm font-semibold text-slate-600';
  const tdClass = 'px-4 py-3 text-start';

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">{t('workOrders.title')}</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-800">{t('workOrders.newOrder')}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>{t('workOrders.doctor')}</span>
            <select
              className={inputClass}
              value={form.doctorId}
              onChange={(e) => setField('doctorId', e.target.value)}
            >
              <option value="">{t('workOrders.selectDoctor')}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t('workOrders.workType')}</span>
            <select
              className={inputClass}
              value={form.workType}
              onChange={(e) => setField('workType', e.target.value)}
            >
              {workTypes.length === 0 && <option value="">{t('workOrders.loading')}</option>}
              {workTypes.map((wt) => (
                <option key={wt} value={wt}>
                  {workTypeLabel(wt)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t('workOrders.color')}</span>
            <input
              className={inputClass}
              value={form.color}
              onChange={(e) => setField('color', e.target.value)}
              placeholder={t('workOrders.colorPh')}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>{t('workOrders.receivedDate')}</span>
              <input
                type="date"
                className={inputClass}
                value={form.receivedDate}
                onChange={(e) => setField('receivedDate', e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t('workOrders.deliveryDate')}</span>
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
          <span className="mb-2 block text-sm text-slate-600">
            {t('workOrders.teethHint', { count: form.teeth.length })}
          </span>
          {/* مخطط الأسنان ترتيبه ثابت (يمين/يسار المريض) فنثبّت اتجاهه LTR */}
          <div className="overflow-x-auto" dir="ltr">
            <ToothChart selected={form.teeth} onToggle={toggleTooth} />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || workTypes.length === 0}
          className="mt-4 rounded-xl bg-teal-600 px-5 py-2 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('workOrders.saving') : t('workOrders.save')}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[760px]">
          <thead className="bg-slate-50">
            <tr>
              <th className={thClass}>{t('workOrders.doctor')}</th>
              <th className={thClass}>{t('workOrders.teeth')}</th>
              <th className={thClass}>{t('workOrders.workType')}</th>
              <th className={thClass}>{t('workOrders.color')}</th>
              <th className={thClass}>{t('workOrders.receivedDate')}</th>
              <th className={thClass}>{t('workOrders.deliveryDate')}</th>
              <th className={thClass}>{t('workOrders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {t('workOrders.empty')}
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 transition hover:bg-teal-50/40">
                <td className={`${tdClass} font-medium text-slate-800`}>{o.doctor?.name}</td>
                <td className={tdClass}>
                  <div dir="ltr" className="inline-block">
                    <ToothChart selected={o.teeth} small />
                  </div>
                </td>
                <td className={tdClass}>{workTypeLabel(o.workType)}</td>
                <td className={tdClass}>{o.color || '—'}</td>
                <td className={tdClass}>{formatDate(o.receivedDate)}</td>
                <td className={tdClass}>{formatDate(o.deliveryDate)}</td>
                <td className={tdClass}>
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    {t('workOrders.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
