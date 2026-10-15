const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const AppError = require('../utils/AppError');

const MAX_SERVICE_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;
const MAX_AMOUNT = 1000000000;

const parseId = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// يرجّع المبلغ مقرّباً لخانتين عشريتين (يمنع كسور غريبة مثل 10.2000000001)
const parseAmount = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
};

// GET /api/sales - كل عمليات البيع (مع اسم الطبيب)
router.get('/', async (req, res) => {
  const sales = await prisma.sale.findMany({
    include: { doctor: true },
    orderBy: { saleDate: 'desc' },
  });
  res.json(sales);
});

// POST /api/sales - تسجيل عملية بيع جديدة
router.post('/', async (req, res) => {
  const { doctorId, serviceType, price, cost, notes } = req.body;

  const doctorIdNum = parseId(doctorId);
  if (!doctorIdNum) throw new AppError('sales.doctorRequired', 400);

  if (typeof serviceType !== 'string' || serviceType.trim() === '') {
    throw new AppError('sales.serviceRequired', 400);
  }
  const cleanService = serviceType.trim();
  if (cleanService.length > MAX_SERVICE_LENGTH) {
    throw new AppError('sales.serviceTooLong', 400);
  }

  const priceNum = parseAmount(price);
  if (priceNum === null || priceNum <= 0) {
    throw new AppError('sales.priceInvalid', 400);
  }

  let costNum = 0;
  if (cost !== undefined && cost !== null && cost !== '') {
    costNum = parseAmount(cost);
    if (costNum === null) throw new AppError('sales.costInvalid', 400);
  }

  let cleanNotes = null;
  if (notes !== undefined && notes !== null && notes !== '') {
    if (typeof notes !== 'string') throw new AppError('common.notesInvalid', 400);
    cleanNotes = notes.trim();
    if (cleanNotes.length > MAX_NOTES_LENGTH) {
      throw new AppError('common.notesTooLong', 400);
    }
    if (cleanNotes === '') cleanNotes = null;
  }

  try {
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
    // P2003 = الطبيب المحدد غير موجود (مفتاح أجنبي)
    if (error.code === 'P2003') throw new AppError('sales.doctorNotFound', 400);
    throw error;
  }
});

module.exports = router;