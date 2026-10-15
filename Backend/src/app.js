require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

const app = express();

// لازم هاد السطر على أي استضافة بتستخدم proxy عشان الكوكي الآمنة والـ rate limit يشتغلوا صح
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

// لغة الرد (عربي/إنجليزي) من هيدر Accept-Language: بيضيف req.lang و req.t()
// لازم يكون قبل الـ rate limit والـ CSRF لأنهم بيستخدموا req.t
app.use(require('./middleware/lang'));

// نحدد حجم الطلب حتى ما حدا يرسل بيانات ضخمة
app.use(express.json({ limit: '100kb' }));

// حد عام للطلبات على كل الـ API (300 طلب كل 15 دقيقة لكل IP)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: req.t('common.tooManyRequests') }),
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

// حماية CSRF: بما إن الكوكي sameSite=none بالإنتاج، منرفض أي طلب بيغيّر البيانات
// (POST/PUT/PATCH/DELETE) إذا الـ Origin أو الـ Referer مو من موقع الفرونت تبعنا
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const source = req.get('Origin') || req.get('Referer');
  // طلبات من غير متصفح (مثل Postman أو curl) ما بتبعت Origin، وما بتستخدم كوكي المتصفح، فمنمرّرها
  if (!source) return next();

  let sourceOrigin;
  try {
    sourceOrigin = new URL(source).origin;
  } catch {
    return res.status(403).json({ error: req.t('common.forbidden') });
  }

  if (sourceOrigin !== allowedOrigin) {
    return res.status(403).json({ error: req.t('common.forbidden') });
  }
  next();
});

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
  res.status(404).json({ error: req.t('common.routeNotFound') });
});

// معالج الأخطاء المركزي (لازم يكون آخر middleware)
app.use(require('./middleware/errorHandler'));

// التشغيل المحلي فقط (على الاستضافات الـ app بيتصدّر وهم بيشغّلوه)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
  });
}

module.exports = app;