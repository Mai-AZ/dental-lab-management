import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axiosClient.post('/auth/login', { username, password });
      navigate('/dashboard');
    } catch (err) {
      if (err.response) {
        // رسالة السيرفر الحقيقية (غلط بالبيانات، أو محاولات كثيرة، ...)
        setError(err.response.data?.error || 'حدث خطأ، حاول مرة ثانية');
      } else {
        // ما وصلنا رد: السيرفر مطفي أو لسا عم يصحى (Neon/Render)
        setError('تعذّر الاتصال بالسيرفر، حاول مرة ثانية بعد قليل');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-80"
      >
        <h1 className="text-xl font-bold mb-6 text-center">تسجيل الدخول</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <label className="block mb-2 text-sm font-medium">اسم المستخدم</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 mb-4"
          required
        />

        <label className="block mb-2 text-sm font-medium">كلمة السر</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 mb-6"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}

export default Login;
