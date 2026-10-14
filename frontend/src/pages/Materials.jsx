import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';
import { useLanguage } from '../i18n/LanguageContext';

// القيم الابتدائية للفورم. الكمية والسعر ما بيتعدلوا من هون،
// بيتحدثوا تلقائياً من المشتريات فقط
const emptyForm = {
  name: '',
  unit: '',
  alertThreshold: '',
};

function Materials() {
  const { t, locale } = useLanguage();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  // يمنع النقرة المزدوجة فوراً (يعني ما بتنضاف مادة مرتين)
  const busyRef = useRef(false);

  // تنسيق الأرقام حسب اللغة (أرقام لاتينية بالحالتين)
  const num = (value, digits) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);

  const fetchMaterials = async () => {
    try {
      const res = await axiosClient.get('/materials');
      setMaterials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        // فاضي = 5 (الافتراضي)، لكن 0 يبقى 0
        alertThreshold:
          String(formData.alertThreshold).trim() === '' ? 5 : Number(formData.alertThreshold),
      };
      if (editingId) {
        await axiosClient.put(`/materials/${editingId}`, payload);
      } else {
        await axiosClient.post('/materials', payload);
      }
      resetForm();
      await fetchMaterials();
    } catch (err) {
      console.error(err);
      if (!err.response) {
        alert(t('materials.errNetwork'));
      } else {
        // رسائل الباك بالعربي حالياً، والبديل مترجم
        alert(err.response.data?.error || t('materials.errGeneric'));
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleEdit = (material) => {
    setFormData({
      name: material.name,
      unit: material.unit,
      alertThreshold: material.alertThreshold,
    });
    setEditingId(material.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('materials.confirmDelete'))) return;
    try {
      await axiosClient.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || t('materials.errDelete'));
    }
  };

  if (loading) return <div className="p-8 text-slate-500">{t('materials.loading')}</div>;

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-start outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
  const thClass = 'px-4 py-3 text-start text-sm font-semibold text-slate-600';
  const tdClass = 'px-4 py-3 text-start';

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{t('materials.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <ExportButton type="materials" />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-xl bg-teal-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow"
          >
            + {t('materials.add')}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-2"
        >
          <input
            name="name" placeholder={t('materials.namePh')} value={formData.name}
            onChange={handleChange} className={inputClass} required
          />
          <input
            name="unit" placeholder={t('materials.unitPh')} value={formData.unit}
            onChange={handleChange} className={inputClass} required
          />
          <input
            name="alertThreshold" type="number" min="0" step="any"
            placeholder={t('materials.thresholdPh')} value={formData.alertThreshold}
            onChange={handleChange} className={`${inputClass} sm:col-span-2`}
          />
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
            {t('materials.hint')}
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('materials.saving') : editingId ? t('materials.saveEdit') : t('materials.create')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-xl bg-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('materials.cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[640px] table-fixed">
          <thead className="bg-slate-50">
            <tr>
              <th className={`${thClass} w-1/5`}>{t('materials.name')}</th>
              <th className={`${thClass} w-1/6`}>{t('materials.unit')}</th>
              <th className={`${thClass} w-1/6`}>{t('materials.quantity')}</th>
              <th className={`${thClass} w-1/6`}>{t('materials.totalPrice')}</th>
              <th className={`${thClass} w-1/6`}>{t('materials.threshold')}</th>
              <th className={`${thClass} w-1/5`}>{t('materials.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {t('materials.empty')}
                </td>
              </tr>
            )}
            {materials.map((m) => {
              const low = m.quantity < m.alertThreshold;
              return (
                <tr
                  key={m.id}
                  className={`border-t border-slate-100 transition hover:bg-teal-50/40 ${low ? 'bg-red-50' : ''}`}
                >
                  <td className={`${tdClass} truncate font-medium text-slate-800`}>{m.name}</td>
                  <td className={`${tdClass} truncate text-slate-600`}>{m.unit}</td>
                  {/* نقرّب العرض حتى ما تظهر كسور طويلة */}
                  <td className={tdClass}>{num(m.quantity, 3)}</td>
                  {/* السعر الإجمالي = الكمية × سعر الوحدة (مجموع مشتريات المادة) */}
                  <td className={tdClass}>{num(m.quantity * m.pricePerUnit, 2)}</td>
                  <td className={tdClass}>{num(m.alertThreshold, 3)}</td>
                  <td className={tdClass}>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(m)} className="font-medium text-teal-600 hover:underline">
                        {t('materials.edit')}
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="font-medium text-red-600 hover:underline">
                        {t('materials.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Materials;
