const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/sales - كل عمليات البيع (مع اسم الطبيب)
router.get('/', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { doctor: true },
      orderBy: { saleDate: 'desc' },
    });
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المبيعات' });
  }
});

// POST /api/sales - تسجيل عملية بيع جديدة
router.post('/', async (req, res) => {
  try {
    const { doctorId, serviceType, price, cost, notes } = req.body;

    const newSale = await prisma.sale.create({
      data: {
        doctorId: Number(doctorId),
        serviceType,
        price,
        cost: cost || 0,
        notes,
      },
    });

    res.status(201).json(newSale);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'حدث خطأ أثناء تسجيل عملية البيع، تأكد من صحة معرف الطبيب' });
  }
});

module.exports = router;