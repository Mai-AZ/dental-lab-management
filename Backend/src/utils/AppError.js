// خطأ متوقع بحالة HTTP محددة (400 مدخلات، 404 غير موجود، 409 تعارض...)
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isAppError = true;
  }
}

module.exports = AppError;