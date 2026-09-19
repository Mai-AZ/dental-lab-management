const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');

// POST /api/auth/login - تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غلط' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غلط' });
    }

    req.session.userId = user.id;

    res.json({ message: 'تم تسجيل الدخول بنجاح', username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// POST /api/auth/logout - تسجيل الخروج
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'تم تسجيل الخروج' });
  });
});

module.exports = router;