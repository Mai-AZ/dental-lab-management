import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useLanguage } from '../i18n/LanguageContext';

// زر تصدير قابل لإعادة الاستخدام.
// type = 'sales' أو 'purchases' أو 'materials' (نفس اسم الـ route بالباك اند)
// label اختياري: إذا انمرّر بيحل محل النص المترجم
export default function ExportButton({ type, label }) {
  const { t } = useLanguage();
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
      alert(t('export.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? t('export.busy') : label || t('export.excel')}
    </button>
  );
}
