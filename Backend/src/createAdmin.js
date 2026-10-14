// سكريبت إنشاء مستخدم admin أول مرة (bootstrap)
// الاستخدام: من داخل Backend → npm run create-admin
// القيم تُقرأ من متغيرات البيئة: ADMIN_USERNAME و ADMIN_PASSWORD
require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./prismaClient');

async function main() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username || !password) {
    console.error('خطأ: لازم تحدد ADMIN_USERNAME و ADMIN_PASSWORD بمتغيرات البيئة.');
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error('خطأ: كلمة السر لازم تكون 8 أحرف على الأقل.');
    process.exitCode = 1;
    return;
  }

  // ما منعدّل ولا منستبدل مستخدم موجود، حتى ما نكتب فوق كلمة سر حقيقية بالغلط
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`المستخدم "${username}" موجود أصلاً، ما تغيّر شي.`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { username, password: hash } });
  console.log(`تم إنشاء المستخدم "${username}" بنجاح.`);
}

main()
  .catch((err) => {
    console.error('فشل إنشاء المستخدم:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());