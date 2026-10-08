import axios from 'axios';

// بالتطوير: localhost، وبالإنتاج: من متغير البيئة VITE_API_URL
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL,
  withCredentials: true,
});

export default axiosClient;