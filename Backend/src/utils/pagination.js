// أدوات الترقيم (pagination) المشتركة بين routes المبيعات والمشتريات
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100; // سقف حتى ما حدا يطلب آلاف الصفوف بطلب واحد

// يقرأ page و limit من الـ query ويرجّع أرقام صحيحة وآمنة (أي قيمة غلط = الافتراضي)
function parsePagination(query) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(Number(query.limit)) || DEFAULT_LIMIT)
  );
  return { page, limit };
}

// يحسب الصفحة الفعلية: لو الصفحة المطلوبة أكبر من الأخيرة (مثلاً بعد حذف آخر صف)
// منرجّع لآخر صفحة موجودة بدل صفحة فاضية
function buildPage({ page, limit, total }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return { page: current, pages, skip: (current - 1) * limit, take: limit };
}

module.exports = { parsePagination, buildPage };