// معالج الأخطاء المركزي: المكان الوحيد اللي بيقرر كود الحالة والرسالة
const { translate } = require('../utils/messages');

const DB_UNAVAILABLE_CODES = ['P1001', 'P1002', 'P1008', 'P2024'];

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // req.t بيجي من middleware/lang. احتياط: لو الخطأ صار قبله منستخدم العربي
  const t = req.t || ((key) => translate('ar', key));

  // خطأ متوقع رميناه بإيدنا (message = مفتاح الرسالة)
  if (err.isAppError) {
    return res.status(err.status).json({ error: t(err.message) });
  }

  // JSON غلط أو طلب كبير (من express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: t('server.badJson') });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: t('server.tooLarge') });
  }

  // أخطاء Prisma المعروفة
  if (err.code === 'P2025') {
    return res.status(404).json({ error: t('server.notFound') });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: t('server.duplicate') });
  }
  if (DB_UNAVAILABLE_CODES.includes(err.code)) {
    console.error(err);
    return res.status(503).json({ error: t('server.dbUnavailable') });
  }

  // أي شي غير متوقع = 500 (ما منعرض التفاصيل للمستخدم)
  console.error(err);
  res.status(500).json({ error: t('server.error') });
};