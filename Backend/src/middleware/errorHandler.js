// معالج الأخطاء المركزي: المكان الوحيد اللي بيقرر كود الحالة والرسالة
const DB_UNAVAILABLE_CODES = ['P1001', 'P1002', 'P1008', 'P2024'];

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // خطأ متوقع رميناه بإيدنا
  if (err.isAppError) {
    return res.status(err.status).json({ error: err.message });
  }

  // JSON غلط أو طلب كبير (من express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'صيغة الطلب غير صحيحة' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'حجم الطلب كبير جداً' });
  }

  // أخطاء Prisma المعروفة
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'العنصر غير موجود' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'هذه القيمة موجودة مسبقاً' });
  }
  if (DB_UNAVAILABLE_CODES.includes(err.code)) {
    console.error(err);
    return res.status(503).json({ error: 'قاعدة البيانات غير متاحة مؤقتاً، حاول بعد قليل' });
  }

  // أي شي غير متوقع = 500 (ما منعرض التفاصيل للمستخدم)
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ في السيرفر' });
};