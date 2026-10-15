const { translate } = require('../utils/messages');

// يحدد لغة الرد من هيدر Accept-Language (الفرونت بيبعته مع كل طلب).
// بيضيف على الطلب: req.lang ('ar' أو 'en') و req.t('المفتاح') لجلب الرسالة المترجمة.
// الافتراضي عربي إذا ما في هيدر أو اللغة غير مدعومة.
module.exports = function lang(req, res, next) {
  req.lang = req.acceptsLanguages('ar', 'en') === 'en' ? 'en' : 'ar';
  req.t = (key) => translate(req.lang, key);
  next();
};
