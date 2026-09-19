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
      fetchData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ، تأكد من صحة البيانات');
    }
  };

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
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input
            name="quantity" type="number" placeholder="الكمية" value={formData.quantity}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="totalPrice" type="number" placeholder="السعر الإجمالي" value={formData.totalPrice}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="notes" placeholder="ملاحظات (اختياري)" value={formData.notes}
            onChange={handleChange} className="border p-2 rounded"
          />
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
            <th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3 text-right">{p.material?.name}</td>
              <td className="p-3 text-right">{p.quantity}</td>
              <td className="p-3 text-right">{p.totalPrice}</td>
              <td className="p-3 text-right">{new Date(p.purchaseDate).toLocaleDateString('ar-EG')}</td>
              <td className="p-3 text-right">{p.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Purchases;
