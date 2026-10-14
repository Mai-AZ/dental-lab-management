// القاموس: كل مفتاح له ترجمة بالعربي والإنجليزي
// إذا ناقصت ترجمة إنجليزية، بيظهر النص العربي بدل ما يطلع فاضي
const translations = {
  ar: {
    'app.name': 'مخبر الأسنان',
    'lang.switch': 'English',

    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.add': 'إضافة',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.actions': 'إجراءات',
    'common.loading': 'جاري التحميل...',
    'common.saving': 'جاري الحفظ...',

    'nav.dashboard': 'لوحة التحكم',
    'nav.materials': 'المواد',
    'nav.purchases': 'المشتريات',
    'nav.sales': 'المبيعات',
    'nav.workOrders': 'سجل الأعمال',
    'nav.logout': 'تسجيل الخروج',

    'login.subtitle': 'سجّل دخولك لإدارة المخبر',
    'login.username': 'اسم المستخدم',
    'login.password': 'كلمة السر',
    'login.submit': 'دخول',
    'login.submitting': 'جاري الدخول...',
    'login.error.generic': 'حدث خطأ، حاول مرة ثانية',
    'login.error.network': 'تعذّر الاتصال بالسيرفر، حاول مرة ثانية بعد قليل',
  },
  en: {
    'app.name': 'Dental Lab',
    'lang.switch': 'العربية',

    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.actions': 'Actions',
    'common.loading': 'Loading...',
    'common.saving': 'Saving...',

    'nav.dashboard': 'Dashboard',
    'nav.materials': 'Materials',
    'nav.purchases': 'Purchases',
    'nav.sales': 'Sales',
    'nav.workOrders': 'Work Orders',
    'nav.logout': 'Log out',

    'login.subtitle': 'Sign in to manage your lab',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.submitting': 'Signing in...',
    'login.error.generic': 'Something went wrong, please try again',
    'login.error.network': 'Could not reach the server, please try again shortly',
  },
};

export default translations;