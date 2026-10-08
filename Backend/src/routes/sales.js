const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const MAX_SERVICE_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;
const MAX_AMOUNT = 1000000000;

const parseId = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseAmount = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_AMOUNT ? n : null;
};

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

    const doctorIdNum = parseId(doctorId);
    if (!doctorIdNum) {
      return res.status(400).json({ error: 'اختاري الطبيب' });
    }

    if (typeof serviceType !== 'string' || serviceType.trim() === '') {
      return res.status(400).json({ error: 'نوع الخدمة مطلوب' });
    }
    const cleanService = serviceType.trim();
    if (cleanService.length > MAX_SERVICE_LENGTH) {
      return res.status(400).json({ error: 'نوع الخدمة طويل جداً' });
    }

    const priceNum = parseAmount(price);
    if (priceNum === null || priceNum <= 0) {
      return res.status(400).json({ error: 'السعر لازم يكون رقماً أكبر من صفر' });
    }

    let costNum = 0;
    if (cost !== undefined && cost !== null && cost !== '') {
      costNum = parseAmount(cost);
      if (costNum === null) {
        return res.status(400).json({ error: 'التكلفة لازم تكون رقماً صالحاً' });
      }
    }

    let cleanNotes = null;
    if (notes !== undefined && notes !== null && notes !== '') {
      if (typeof notes !== 'string') {
        return res.status(400).json({ error: 'الملاحظات غير صالحة' });
      }
      cleanNotes = notes.trim();
      if (cleanNotes.length > MAX_NOTES_LENGTH) {
        return res.status(400).json({ error: 'الملاحظات طويلة جداً' });
      }
      if (cleanNotes === '') cleanNotes = null;
    }

    const newSale = await prisma.sale.create({
      data: {
        doctorId: doctorIdNum,
        serviceType: cleanService,
        price: priceNum,
        cost: costNum,
        notes: cleanNotes,
      },
      include: { doctor: true },
    });

    res.status(201).json(newSale);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'الطبيب غير موجود' });
    }
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل عملية البيع' });
  }
});

module.exports = router;