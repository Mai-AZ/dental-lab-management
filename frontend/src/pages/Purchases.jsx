import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    materialId: '',
    quantity: '',
    totalPrice: '',
    notes: '',
  });

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
    try {
      await axiosClient.post('/purchases', {
        ...formData,
        materialId: Number(formData.materialId),
        quantity: Number(formData.quantity),
        totalPrice: Number(formData.totalPrice),
      });
      resetForm();
      // نعيد تحميل المشتريات والمواد معاً لأن الكمية والسعر تغيّرا في المواد
      fetchData();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error || 'حدث خطأ، تأكد من صحة البيانات';
      alert(message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('متأكدة من حذف عملية الشراء؟ سيتم خصم كميتها من المخزون.')) return;
    try {
      await axiosClient.delete(`/purchases/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'حدث خطأ أثناء حذف عملية الشراء');
    }
  };

  // سعر الوحدة لعملية الشراء الحالية (معاينة قبل الحفظ)
  const unitPricePreview =
    Number(formData.quantity) > 0 && Number(formData.totalPrice) > 0
      ? (Number(formData.totalPrice) / Number(formData.quantity)).toFixed(2)
      : null;

  const selectedMaterial = materials.find((m) => m.id === Number(formData.materialId));

  if (loading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">المشتريات</h1>
        <div className="flex gap-2">
          <ExportButton type="purchases" />
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + تسجيل شراء
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-6 grid grid-cols-2 gap-4">
          <select
            name="materialId" value={formData.materialId}
            onChange={handleChange} className="border p-2 rounded" required
          >
            <option value="">اختر المادة</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
          <input
            name="quantity" type="number" min="0" step="any"
            placeholder={selectedMaterial ? `الكمية (${selectedMaterial.unit})` : 'الكمية'}
            value={formData.quantity}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="totalPrice" type="number" min="0" step="any"
            placeholder="السعر الإجمالي" value={formData.totalPrice}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="notes" placeholder="ملاحظات (اختياري)" value={formData.notes}
            onChange={handleChange} className="border p-2 rounded"
          />
          {unitPricePreview && (
            <p className="col-span-2 text-sm text-gray-600">
              سعر الوحدة في هذه العملية: {unitPricePreview}
              {selectedMaterial ? ` لكل ${selectedMaterial.unit}` : ''}
            </p>
          )}
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
              تسجيل
            </button>
            <button type="button" onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded">
              إلغاء
            </button>
          </div>
        </form>
      )}

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-right">المادة</th>
            <th className="p-3 text-right">الكمية</th>
            <th className="p-3 text-right">السعر الإجمالي</th>
            <th className="p-3 text-right">سعر الوحدة</th>
            <th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">ملاحظات</th>
            <th className="p-3 text-right">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3 text-right">{p.material?.name}</td>
              <td className="p-3 text-right">{p.quantity}</td>
              <td className="p-3 text-right">{p.totalPrice}</td>
              <td className="p-3 text-right">
                {p.quantity > 0 ? (p.totalPrice / p.quantity).toFixed(2) : '-'}
              </td>
              <td className="p-3 text-right">{new Date(p.purchaseDate).toLocaleDateString('ar-EG')}</td>
              <td className="p-3 text-right">{p.notes || '-'}</td>
              <td className="p-3 text-right">
                <button onClick={() => handleDelete(p.id)} className="text-red-600">حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Purchases;
