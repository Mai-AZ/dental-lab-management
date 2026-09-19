const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/dashboard/summary - ملخص الربح والخسارة
router.get('/summary', async (req, res) => {
  try {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء حساب الملخص المالي' });
  }
});

// GET /api/dashboard/recent-activity - آخر 5 مبيعات وآخر 5 مشتريات
router.get('/recent-activity', async (req, res) => {
  try {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب آخر العمليات' });
  }
});
module.exports = router;
// GET /api/dashboard/materials-status - كل المواد مع حالتها
router.get('/materials-status', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { quantity: 'asc' },
    });
    res.json(materials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب حالة المواد' });
  }
});