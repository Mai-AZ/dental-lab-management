import axios from 'axios';

// بالتطوير: localhost، وبالإنتاج: من متغير البيئة VITE_API_URL
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL,
  withCredentials: true,
});

// نبعت لغة الواجهة مع كل طلب حتى يرد الباك برسائل بنفس اللغة
// (نفس مفتاح localStorage اللي بيستخدمه LanguageContext)
axiosClient.interceptors.request.use((config) => {
  let lang = 'ar';
  try {
    lang = localStorage.getItem('lang') === 'en' ? 'en' : 'ar';
  } catch {
    // إذا localStorage غير متاح منبقى على العربي
  }
  config.headers['Accept-Language'] = lang;
  return config;
});

export default axiosClient;