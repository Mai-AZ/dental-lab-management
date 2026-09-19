const express = require('express');
const cors = require('cors');
const session = require('express-session');

require('dotenv').config();

const app = express();

// لازم هاد السطر على Render (أو أي استضافة تستخدم proxy) عشان الكوكي الآمنة تشتغل صح
app.set('trust proxy', 1);

// CORS: بالتطوير المحلي بيستخدم localhost، وبالإنتاج بيستخدم رابط الفرونت اند من متغير البيئة
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// لازم يكون SESSION_SECRET موجود دايماً، وإلا السيرفر ما بيشتغل (أأمن من قيمة احتياطية ثابتة بالكود)
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET غير موجود بمتغيرات البيئة! لازم تضيفيه بملف .env');
}

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'السيرفر شغال تمام' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
});