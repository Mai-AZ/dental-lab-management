require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

const app = express();

// لازم هاد السطر على Render (أو أي استضافة تستخدم proxy) عشان الكوكي الآمنة والـ rate limit يشتغلوا صح
app.set('trust proxy', 1);

// رؤوس HTTP أمنية أساسية
app.use(helmet());

// CORS: بالتطوير المحلي بيستخدم localhost، وبالإنتاج بيستخدم رابط الفرونت اند من متغير البيئة
// نشيل الـ / من آخر الرابط إذا انكتبت بالغلط، لأنها بتخلي CORS يفشل
const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

// نحدد حجم الطلب حتى ما حدا يرسل بيانات ضخمة
app.use(express.json({ limit: '100kb' }));

// حد عام للطلبات على كل الـ API (300 طلب كل 15 دقيقة لكل IP)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة، حاول بعد قليل' },
}));

// لازم يكون SESSION_SECRET موجود دايماً، وإلا السيرفر ما بيشتغل
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET غير موجود بمتغيرات البيئة! لازم تضيفه بملف .env');
}

const isProduction = process.env.NODE_ENV === 'production';

// الجلسات بتنحفظ بقاعدة البيانات (Neon) بدل الذاكرة، فما بتضيع عند إعادة تشغيل السيرفر
// max: 3 حتى ما نستهلك كل اتصالات قاعدة البيانات
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});

pgPool.on('error', (err) => console.error('خطأ بالاتصال بقاعدة بيانات الجلسات:', err.message));

app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,                       // https بس بالإنتاج
    sameSite: isProduction ? 'none' : 'lax',     // 'none' لازم لما الفرونت والباك على دومينين مختلفين
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

const requireAuth = require('./middleware/requireAuth');

const materialsRouter = require('./routes/materials');
app.use('/api/materials', requireAuth, materialsRouter);

const purchasesRouter = require('./routes/purchases');
app.use('/api/purchases', requireAuth, purchasesRouter);

const doctorsRouter = require('./routes/doctors');
app.use('/api/doctors', requireAuth, doctorsRouter);

const salesRouter = require('./routes/sales');
app.use('/api/sales', requireAuth, salesRouter);

const dashboardRouter = require('./routes/dashboard');
app.use('/api/dashboard', requireAuth, dashboardRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const exportRouter = require('./routes/export');
app.use('/api/export', requireAuth, exportRouter);

const workOrdersRouter = require('./routes/workOrders');
app.use('/api/work-orders', requireAuth, workOrdersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'السيرفر شغال تمام' });
});

// أي route غير موجود
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// معالج أخطاء عام: ما بنعرض تفاصيل الخطأ للمستخدم
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ في السيرفر' });
});

// التشغيل المحلي فقط (على الاستضافات الـ app بيتصدّر وهم بيشغّلوه)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
  });
}

module.exports = app;