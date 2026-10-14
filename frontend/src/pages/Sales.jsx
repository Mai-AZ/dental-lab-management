import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';
import { useLanguage } from '../i18n/LanguageContext';

const emptySale = { doctorId: '', serviceType: '', price: '', cost: '', notes: '' };
const emptyDoctor = { name: '', phone: '' };

function Sales() {
  const { t, locale } = useLanguage();
  const [sales, setSales] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // يمنع النقرة المزدوجة فوراً (يعني ما بتنسجّل عملية بيع مرتين)
  const busyRef = useRef(false);
  const [formData, setFormData] = useState(emptySale);
  const [doctorData, setDoctorData] = useState(emptyDoctor);

  // تنسيق الأرقام حسب اللغة (أرقام لاتينية بالحالتين)
  const num = (value, digits) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);

  const fetchData = async () => {
    try {
      const [salesRes, doctorsRes] = await Promise.all([
        axiosClient.get('/sales'),
        axiosClient.get('/doctors'),
      ]);
      setSales(salesRes.data);
      setDoctors(doctorsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData(emptySale);
    setShowForm(false);
  };

  const resetDoctorForm = () => {
    setDoctorData(emptyDoctor);
    setShowDoctorForm(false);
  };

  const showError = (err, fallbackKey) => {
    if (!err.response) {
      alert(t('sales.errNetwork'));
    } else {
      // رسائل الباك بالعربي حالياً، والبديل مترجم
      alert(err.response.data?.error || t(fallbackKey));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      await axiosClient.post('/sales', {
        ...formData,
        doctorId: Number(formData.doctorId),
        price: Number(formData.price),
        cost: Number(formData.cost) || 0,
      });
      resetForm();
      await fetchData();
    } catch (err) {
      console.error(err);
      showError(err, 'sales.errGeneric');
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      await axiosClient.post('/doctors', doctorData);
      resetDoctorForm();
      await fetchData();
    } catch (err) {
      console.error(err);
      showError(err, 'sales.errDoctor');
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">{t('sales.loading')}</div>;

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-start outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
  const thClass = 'px-4 py-3 text-start text-sm font-semibold text-slate-600';
  const tdClass = 'px-4 py-3 text-start';
  const primaryBtn =
    'rounded-xl bg-teal-600 px-4 py-2 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60';
  const cancelBtn =
    'rounded-xl bg-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{t('sales.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <ExportButton type="sales" />
          <button
            onClick={() => setShowDoctorForm(true)}
            className="rounded-xl bg-amber-500 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-amber-600 hover:shadow"
          >
            + {t('sales.addDoctor')}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-teal-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow"
          >
            + {t('sales.add')}
          </button>
        </div>
      </div>

      {showDoctorForm && (
        <form
          onSubmit={handleDoctorSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-2"
        >
          <input
            placeholder={t('sales.doctorNamePh')} value={doctorData.name}
            onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
            className={inputClass} required
          />
          <input
            placeholder={t('sales.phonePh')} value={doctorData.phone}
            onChange={(e) => setDoctorData({ ...doctorData, phone: e.target.value })}
            className={inputClass}
          />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? t('sales.saving') : t('sales.submitDoctor')}
            </button>
            <button type="button" onClick={resetDoctorForm} disabled={submitting} className={cancelBtn}>
              {t('sales.cancel')}
            </button>
          </div>
        </form>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-2"
        >
          <select
            name="doctorId" value={formData.doctorId}
            onChange={handleChange} className={inputClass} required
          >
            <option value="">{t('sales.selectDoctor')}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            name="serviceType" placeholder={t('sales.serviceTypePh')} value={formData.serviceType}
            onChange={handleChange} className={inputClass} required
          />
          <input
            name="price" type="number" min="0" step="any"
            placeholder={t('sales.pricePh')} value={formData.price}
            onChange={handleChange} className={inputClass} required
          />
          <input
            name="cost" type="number" min="0" step="any"
            placeholder={t('sales.costPh')} value={formData.cost}
            onChange={handleChange} className={inputClass}
          />
          <input
            name="notes" placeholder={t('sales.notesPh')} value={formData.notes}
            onChange={handleChange} className={`${inputClass} sm:col-span-2`}
          />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? t('sales.saving') : t('sales.submit')}
            </button>
            <button type="button" onClick={resetForm} disabled={submitting} className={cancelBtn}>
              {t('sales.cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[560px]">
          <thead className="bg-slate-50">
            <tr>
              <th className={thClass}>{t('sales.doctor')}</th>
              <th className={thClass}>{t('sales.serviceType')}</th>
              <th className={thClass}>{t('sales.price')}</th>
              <th className={thClass}>{t('sales.cost')}</th>
              <th className={thClass}>{t('sales.date')}</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t('sales.empty')}
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 transition hover:bg-teal-50/40">
                <td className={`${tdClass} font-medium text-slate-800`}>{s.doctor?.name}</td>
                <td className={tdClass}>{s.serviceType}</td>
                <td className={tdClass}>{num(s.price, 2)}</td>
                <td className={tdClass}>{num(s.cost, 2)}</td>
                <td className={tdClass}>{new Date(s.saleDate).toLocaleDateString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Sales;
