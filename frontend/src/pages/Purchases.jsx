import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';
import { useLanguage } from '../i18n/LanguageContext';

function Purchases() {
  const { t, locale } = useLanguage();
  const [purchases, setPurchases] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // الـ ref بيمنع النقرة المزدوجة فوراً (الـ state بيتحدّث متأخر شوي)
  const busyRef = useRef(false);
  const [formData, setFormData] = useState({
    materialId: '',
    quantity: '',
    totalPrice: '',
    notes: '',
  });

  // تنسيق الأرقام والتواريخ حسب اللغة (أرقام لاتينية بالحالتين)
  const num = (value, digits) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);

  const fetchData = async () => {
    try {
      const [purchasesRes, materialsRes] = await Promise.all([
        axiosClient.get('/purchases'),
        axiosClient.get('/materials'),
      ]);
      setPurchases(purchasesRes.data);
      setMaterials(materialsRes.data);
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
    setFormData({ materialId: '', quantity: '', totalPrice: '', notes: '' });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      await axiosClient.post('/purchases', {
        ...formData,
        materialId: Number(formData.materialId),
        quantity: Number(formData.quantity),
        totalPrice: Number(formData.totalPrice),
      });
      resetForm();
      // نعيد تحميل المشتريات والمواد معاً لأن الكمية والسعر تغيّرا في المواد
      await fetchData();
    } catch (err) {
      console.error(err);
      if (!err.response) {
        alert(t('purchases.errNetwork'));
      } else {
        alert(err.response.data?.error || t('purchases.errGeneric'));
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (busyRef.current) return;
    if (!confirm(t('purchases.confirmDelete'))) return;
    busyRef.current = true;
    setDeletingId(id);
    try {
      await axiosClient.delete(`/purchases/${id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || t('purchases.errDelete'));
    } finally {
      busyRef.current = false;
      setDeletingId(null);
    }
  };

  // سعر الوحدة لعملية الشراء الحالية (معاينة قبل الحفظ)
  const unitPricePreview =
    Number(formData.quantity) > 0 && Number(formData.totalPrice) > 0
      ? num(Number(formData.totalPrice) / Number(formData.quantity), 2)
      : null;

  const selectedMaterial = materials.find((m) => m.id === Number(formData.materialId));

  if (loading) return <div className="p-8 text-slate-500">{t('purchases.loading')}</div>;

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-start outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
  const thClass = 'px-4 py-3 text-start text-sm font-semibold text-slate-600';
  const tdClass = 'px-4 py-3 text-start';

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{t('purchases.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <ExportButton type="purchases" />
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-teal-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-teal-700 hover:shadow"
          >
            + {t('purchases.add')}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-2"
        >
          <select
            name="materialId" value={formData.materialId}
            onChange={handleChange} className={inputClass} required
          >
            <option value="">{t('purchases.selectMaterial')}</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
          <input
            name="quantity" type="number" min="0" step="any"
            placeholder={
              selectedMaterial
                ? t('purchases.quantityWithUnit', { unit: selectedMaterial.unit })
                : t('purchases.quantityPh')
            }
            value={formData.quantity}
            onChange={handleChange} className={inputClass} required
          />
          <input
            name="totalPrice" type="number" min="0" step="any"
            placeholder={t('purchases.totalPricePh')} value={formData.totalPrice}
            onChange={handleChange} className={inputClass} required
          />
          <input
            name="notes" placeholder={t('purchases.notesPh')} value={formData.notes}
            onChange={handleChange} className={inputClass}
          />
          {unitPricePreview && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
              {selectedMaterial
                ? t('purchases.unitPricePreviewPer', { price: unitPricePreview, unit: selectedMaterial.unit })
                : t('purchases.unitPricePreview', { price: unitPricePreview })}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('purchases.saving') : t('purchases.submit')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-xl bg-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('purchases.cancel')}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50">
            <tr>
              <th className={thClass}>{t('purchases.material')}</th>
              <th className={thClass}>{t('purchases.quantity')}</th>
              <th className={thClass}>{t('purchases.totalPrice')}</th>
              <th className={thClass}>{t('purchases.unitPrice')}</th>
              <th className={thClass}>{t('purchases.date')}</th>
              <th className={thClass}>{t('purchases.notes')}</th>
              <th className={thClass}>{t('purchases.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {t('purchases.empty')}
                </td>
              </tr>
            )}
            {purchases.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 transition hover:bg-teal-50/40">
                <td className={`${tdClass} font-medium text-slate-800`}>{p.material?.name}</td>
                <td className={tdClass}>{num(p.quantity, 3)}</td>
                <td className={tdClass}>{num(p.totalPrice, 2)}</td>
                <td className={tdClass}>
                  {p.quantity > 0 ? num(p.totalPrice / p.quantity, 2) : '-'}
                </td>
                <td className={tdClass}>{new Date(p.purchaseDate).toLocaleDateString(locale)}</td>
                <td className={`${tdClass} text-slate-600`}>{p.notes || '-'}</td>
                <td className={tdClass}>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId !== null || submitting}
                    className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === p.id ? t('purchases.deleting') : t('purchases.delete')}
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

export default Purchases;
