import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';

function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    quantity: '',
    pricePerUnit: '',
    alertThreshold: '',
  });

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
    setFormData({ name: '', unit: '', quantity: '', pricePerUnit: '', alertThreshold: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        pricePerUnit: Number(formData.pricePerUnit),
        alertThreshold: Number(formData.alertThreshold) || 5,
      };
      if (editingId) {
        await axiosClient.put(`/materials/${editingId}`, payload);
      } else {
        await axiosClient.post('/materials', payload);
      }
      resetForm();
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ، تأكد من صحة البيانات');
    }
  };

  const handleEdit = (material) => {
    setFormData({
      name: material.name,
      unit: material.unit,
      quantity: material.quantity,
      pricePerUnit: material.pricePerUnit,
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
            name="quantity" type="number" placeholder="الكمية" value={formData.quantity}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="pricePerUnit" type="number" placeholder="سعر الوحدة" value={formData.pricePerUnit}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="alertThreshold" type="number" placeholder="حد التنبيه (افتراضي 5 لو تركتها فاضية)" value={formData.alertThreshold}
            onChange={handleChange} className="border p-2 rounded"
          />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
              {editingId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            <button type="button" onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded">
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
      <th className="p-3 text-right w-1/6">السعر</th>
      <th className="p-3 text-right w-1/6">حد التنبيه</th>
      <th className="p-3 text-right w-1/5">إجراءات</th>
    </tr>
  </thead>
  <tbody>
  {materials.map((m) => (
    <tr key={m.id} className={`border-t ${m.quantity < m.alertThreshold ? 'bg-red-50' : ''}`}>
      <td className="p-3 text-right truncate">{m.name}</td>
      <td className="p-3 text-right truncate">{m.unit}</td>
      <td className="p-3 text-right">{m.quantity}</td>
      <td className="p-3 text-right">{m.pricePerUnit}</td>
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