// يلف أي route غير متزامن ويمرّر أي خطأ لمعالج الأخطاء المركزي (بدون try/catch)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;