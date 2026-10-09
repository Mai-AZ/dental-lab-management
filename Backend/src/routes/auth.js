const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const prisma = require('../prismaClient');

// حد لمحاولات تسجيل الدخول: 10 محاولات كل 15 دقيقة لكل IP (يمنع تخمين كلمة السر)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة، حاول مرة ثانية بعد 15 دقيقة' },
});

// هاش وهمي: نقارن معه لما يكون اسم المستخدم غلط، حتى يتساوى وقت الرد
// ولا يقدر أحد يعرف إذا كان اسم المستخدم موجود أو لا
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

// POST /api/auth/login - تسجيل الدخول
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // فحص المدخلات: لازم نصوص وغير فارغة
    if (
      typeof username !== 'string' || typeof password !== 'string' ||
      !username.trim() || !password
    ) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة السر مطلوبان' });
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });

    const passwordMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غلط' });
    }

    // نجدد الجلسة بعد تسجيل الدخول (يمنع هجوم Session Fixation)
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
      }
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error(saveErr);
          return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
        }
        res.json({ message: 'تم تسجيل الدخول بنجاح', username: user.username });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// POST /api/auth/logout - تسجيل الخروج
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    const isProduction = process.env.NODE_ENV === 'production';
    // لازم نفس خيارات الكوكي الأصلية، وإلا المتصفح ما بيمسحها بالإنتاج
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
    res.json({ message: 'تم تسجيل الخروج' });
  });
});

module.exports = router;