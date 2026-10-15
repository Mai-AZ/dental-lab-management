// خطأ متوقع بحالة HTTP محددة (400 مدخلات، 404 غير موجود، 409 تعارض...)
// message = مفتاح رسالة من utils/messages.js (مثل 'materials.notFound')
// والمعالج المركزي بيترجمه حسب لغة الطلب
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isAppError = true;
  }
}

module.exports = AppError;