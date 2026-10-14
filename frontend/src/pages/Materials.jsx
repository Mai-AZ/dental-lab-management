import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';

// القيم الابتدائية للفورم. الكمية والسعر ما بيتعدلوا من هون،
// بيتحدثوا تلقائياً من المشتريات فقط
const emptyForm = {
  name: '',
  unit: '',
  alertThreshold: '',
};

function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  // يمنع النقرة المزدوجة فوراً (يعني ما بتنضاف مادة مرتين)
  const busyRef = useRef(false);

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
        alert('تعذّر الاتصال بالسيرفر، تأكد أنه شغّال وحاول مرة ثانية');
      } else {
        alert(err.response.data?.error || 'حدث خطأ، تأكد من صحة البيانات');
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
    if (!confirm('متأكد من الحذف؟')) return;
    try {
      await axiosClient.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error || 'حدث خطأ أثناء حذف المادة';
      alert(message);
    }
  };

  if (loading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المواد</h1>
        <div className="flex gap-2">
          <ExportButton type="materials" />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + إضافة مادة
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-6 grid grid-cols-2 gap-4">
          <input
            name="name" placeholder="اسم المادة" value={formData.name}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="unit" placeholder="الوحدة (غرام، مل...)" value={formData.unit}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="alertThreshold" type="number" min="0" step="any"
            placeholder="حد التنبيه (افتراضي 5 لو تركتها فاضية)" value={formData.alertThreshold}
            onChange={handleChange} className="border p-2 rounded col-span-2"
          />
          <p className="col-span-2 text-sm text-gray-500">
            الكمية والسعر يبدآن من صفر، ويتحدثان تلقائياً عند تسجيل أي عملية شراء لهذه المادة.
          </p>
          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="bg-gray-300 px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <table className="w-full bg-white rounded shadow table-fixed">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-right w-1/5">الاسم</th>
            <th className="p-3 text-right w-1/6">الوحدة</th>
            <th className="p-3 text-right w-1/6">الكمية</th>
            <th className="p-3 text-right w-1/6">السعر الإجمالي</th>
            <th className="p-3 text-right w-1/6">حد التنبيه</th>
            <th className="p-3 text-right w-1/5">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id} className={`border-t ${m.quantity < m.alertThreshold ? 'bg-red-50' : ''}`}>
              <td className="p-3 text-right truncate">{m.name}</td>
              <td className="p-3 text-right truncate">{m.unit}</td>
              {/* نقرّب العرض حتى ما تظهر كسور طويلة */}
              <td className="p-3 text-right">{Math.round(m.quantity * 1000) / 1000}</td>
              {/* السعر الإجمالي = الكمية × سعر الوحدة (مجموع مشتريات المادة) */}
              <td className="p-3 text-right">{Math.round(m.quantity * m.pricePerUnit * 100) / 100}</td>
              <td className="p-3 text-right">{m.alertThreshold}</td>
              <td className="p-3 text-right">
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleEdit(m)} className="text-blue-600">تعديل</button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-600">حذف</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Materials;
