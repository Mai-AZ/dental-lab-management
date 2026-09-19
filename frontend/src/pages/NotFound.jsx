import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-gray-600">الصفحة غير موجودة.</p>
      <Link
        to="/dashboard"
        className="mt-4 inline-block rounded bg-teal-700 px-4 py-2 text-white hover:bg-teal-800"
      >
        العودة للوحة التحكم
      </Link>
    </div>
  );
}