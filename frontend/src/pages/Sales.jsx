import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import ExportButton from '../components/ExportButton';

function Sales() {
  const [sales, setSales] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: '',
    serviceType: '',
    price: '',
    cost: '',
    notes: '',
  });
  const [doctorData, setDoctorData] = useState({ name: '', phone: '' });

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
    setFormData({ doctorId: '', serviceType: '', price: '', cost: '', notes: '' });
    setShowForm(false);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await axiosClient.post('/sales', {
      ...formData,
      doctorId: Number(formData.doctorId),
      price: Number(formData.price),
      cost: Number(formData.cost) || 0,
    });
    resetForm();
    fetchData();
  } catch (err) {
    console.error(err);
    alert('حدث خطأ، تأكد من صحة البيانات');
  }
};

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/doctors', doctorData);
      setDoctorData({ name: '', phone: '' });
      setShowDoctorForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الطبيب');
    }
  };

  if (loading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">المبيعات</h1>
        <div className="flex gap-2">
          
        <div className="flex gap-2">
  <ExportButton type="sales" />
  <button
    onClick={() => setShowDoctorForm(true)}
    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
  >
    + طبيب جديد
  </button>
  <button
    onClick={() => setShowForm(true)}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    + تسجيل بيع
  </button>
</div>
        </div>
      </div>

      {showDoctorForm && (
        <form onSubmit={handleDoctorSubmit} className="bg-white p-6 rounded shadow mb-6 grid grid-cols-2 gap-4">
          <input
            placeholder="اسم الطبيب" value={doctorData.name}
            onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
            className="border p-2 rounded" required
          />
          <input
            placeholder="رقم الهاتف" value={doctorData.phone}
            onChange={(e) => setDoctorData({ ...doctorData, phone: e.target.value })}
            className="border p-2 rounded"
          />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">إضافة الطبيب</button>
            <button type="button" onClick={() => setShowDoctorForm(false)} className="bg-gray-300 px-4 py-2 rounded">إلغاء</button>
          </div>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-6 grid grid-cols-2 gap-4">
          <select
            name="doctorId" value={formData.doctorId}
            onChange={handleChange} className="border p-2 rounded" required
          >
            <option value="">اختر الطبيب</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            name="serviceType" placeholder="نوع الخدمة" value={formData.serviceType}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="price" type="number" placeholder="سعر البيع" value={formData.price}
            onChange={handleChange} className="border p-2 rounded" required
          />
          <input
            name="cost" type="number" placeholder="التكلفة" value={formData.cost}
            onChange={handleChange} className="border p-2 rounded"
          />
          <input
            name="notes" placeholder="ملاحظات (اختياري)" value={formData.notes}
            onChange={handleChange} className="border p-2 rounded col-span-2"
          />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">تسجيل</button>
            <button type="button" onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded">إلغاء</button>
          </div>
        </form>
      )}

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-right">الطبيب</th>
            <th className="p-3 text-right">نوع الخدمة</th>
            <th className="p-3 text-right">السعر</th>
            <th className="p-3 text-right">التكلفة</th>
            <th className="p-3 text-right">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-3 text-right">{s.doctor?.name}</td>
              <td className="p-3 text-right">{s.serviceType}</td>
              <td className="p-3 text-right">{s.price}</td>
              <td className="p-3 text-right">{s.cost}</td>
              <td className="p-3 text-right">{new Date(s.saleDate).toLocaleDateString('ar-EG')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Sales;