const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// أي خطأ بهالـ routes بيروح تلقائياً للمعالج المركزي (Express 5)، فما منحتاج try/catch

// GET /api/dashboard/summary - ملخص الربح والخسارة
router.get('/summary', async (req, res) => {
  // مجموع كل المبيعات
  const salesResult = await prisma.sale.aggregate({
    _sum: { price: true },
  });

  // مجموع كل المشتريات
  const purchasesResult = await prisma.purchase.aggregate({
    _sum: { totalPrice: true },
  });
  //.aggregate(...): دالة خاصة بـ Prisma معناها "اعمل عملية حسابية على كل الصفوف مباشرة بقاعدة البيانات"، بدل ما تجيب كل الصفوف لعندك وتحسبها يدوياً

  const totalSales = salesResult._sum.price || 0;
  const totalPurchases = purchasesResult._sum.totalPrice || 0;
  const netProfit = totalSales - totalPurchases;

  res.json({
    totalSales,
    totalPurchases,
    netProfit,
  });
});

// GET /api/dashboard/recent-activity - آخر 5 مبيعات وآخر 5 مشتريات
router.get('/recent-activity', async (req, res) => {
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { saleDate: 'desc' },
    include: { doctor: true },
  });

  const recentPurchases = await prisma.purchase.findMany({
    take: 5,
    orderBy: { purchaseDate: 'desc' },
    include: { material: true },
  });

  res.json({
    recentSales,
    recentPurchases,
  });
});

// GET /api/dashboard/monthly - مبيعات ومشتريات آخر 6 أشهر (للرسم البياني)
router.get('/monthly', async (req, res) => {
  const now = new Date();
  // أول يوم من الشهر قبل 5 أشهر (يعني 6 أشهر مع الشهر الحالي)
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: start } },
      select: { price: true, saleDate: true },
    }),
    prisma.purchase.findMany({
      where: { purchaseDate: { gte: start } },
      select: { totalPrice: true, purchaseDate: true },
    }),
  ]);

  const keyOf = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
  };

  // نجهّز 6 أشهر فاضية (حتى الأشهر بدون عمليات تظهر بقيمة 0)
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    months.push({ key: keyOf(d), month: d.getMonth(), sales: 0, purchases: 0 });
  }
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));

  for (const s of sales) {
    const m = byKey[keyOf(s.saleDate)];
    if (m) m.sales += Number(s.price) || 0;
  }
  for (const p of purchases) {
    const m = byKey[keyOf(p.purchaseDate)];
    if (m) m.purchases += Number(p.totalPrice) || 0;
  }

  res.json(
    months.map((m) => ({
      key: m.key,
      month: m.month,
      sales: Math.round(m.sales * 100) / 100,
      purchases: Math.round(m.purchases * 100) / 100,
    }))
  );
});

// GET /api/dashboard/materials-status - كل المواد مع حالتها
router.get('/materials-status', async (req, res) => {
  const materials = await prisma.material.findMany({
    orderBy: { quantity: 'asc' },
  });
  res.json(materials);
});

module.exports = router;