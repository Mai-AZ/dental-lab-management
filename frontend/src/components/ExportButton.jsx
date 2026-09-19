import { useState } from 'react';
import axiosClient from '../api/axiosClient';

// زر تصدير قابل لإعادة الاستخدام.
// type = 'sales' أو 'purchases' أو 'materials' (نفس اسم الـ route بالباك اند)
export default function ExportButton({ type, label = 'تصدير Excel' }) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      // responseType: 'blob' لأن الرد ملف وليس JSON
      const res = await axiosClient.get(`/export/${type}`, {
        responseType: 'blob',
      });

      // نبني رابط مؤقت للملف ونضغط عليه برمجياً ليبدأ التحميل
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('تعذّر تصدير الملف. حاولي مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className="rounded bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800 disabled:opacity-60"
    >
      {busy ? 'جارِ التصدير...' : label}
    </button>
  );
}
