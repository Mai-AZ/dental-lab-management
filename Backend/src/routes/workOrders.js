const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const WORK_TYPES = [
  'خزف PDF',
  'خزف zircon',
  'تعويض فوق الزرع',
  'تعويض مؤقت',
  'أوجه فينيرز',
];

// UR = علوي أيمن، UL = علوي أيسر، LR = سفلي أيمن، LL = سفلي أيسر
const TOOTH_PATTERN = /^(UR|UL|LR|LL)[1-8]$/;
const MAX_TEETH = 32;
const MAX_COLOR_LENGTH = 20;

const parseId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseDate = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

router.get('/', async (req, res) => {
  try {
    const orders = await prisma.workOrder.findMany({
      include: { doctor: true },
      orderBy: { receivedDate: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأعمال' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { doctorId, teeth, workType, color, receivedDate, deliveryDate } = req.body;

    const doctorIdNum =
      typeof doctorId === 'number' || typeof doctorId === 'string'
        ? parseId(doctorId)
        : null;
    if (!doctorIdNum) {
      return res.status(400).json({ error: 'اختاري الطبيب' });
    }

    if (!Array.isArray(teeth) || teeth.length === 0) {
      return res.status(400).json({ error: 'اختاري سن واحد على الأقل' });
    }
    if (teeth.length > MAX_TEETH) {
      return res.status(400).json({ error: 'عدد الأسنان أكبر من المسموح' });
    }
    if (!teeth.every((t) => typeof t === 'string' && TOOTH_PATTERN.test(t))) {
      return res.status(400).json({ error: 'قيمة سن غير صالحة' });
    }

    if (!WORK_TYPES.includes(workType)) {
      return res.status(400).json({ error: 'نوع العمل غير صالح' });
    }

    let cleanColor = null;
    if (color !== undefined && color !== null && color !== '') {
      if (typeof color !== 'string') {
        return res.status(400).json({ error: 'اللون غير صالح' });
      }
      cleanColor = color.trim();
      if (cleanColor.length > MAX_COLOR_LENGTH) {
        return res.status(400).json({ error: 'اسم اللون طويل جداً' });
      }
      if (cleanColor === '') cleanColor = null;
    }

    const received = parseDate(receivedDate);
    if (!received) {
      return res.status(400).json({ error: 'تاريخ الاستلام غير صالح' });
    }

    let delivery = null;
    if (deliveryDate) {
      delivery = parseDate(deliveryDate);
      if (!delivery) {
        return res.status(400).json({ error: 'تاريخ التسليم غير صالح' });
      }
      if (delivery < received) {
        return res.status(400).json({ error: 'تاريخ التسليم لازم يكون بعد تاريخ الاستلام' });
      }
    }

    const order = await prisma.workOrder.create({
      data: {
        doctorId: doctorIdNum,
        teeth: [...new Set(teeth)],
        workType,
        color: cleanColor,
        receivedDate: received,
        deliveryDate: delivery,
      },
      include: { doctor: true },
    });
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'الطبيب غير موجود' });
    }
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة العمل' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'معرّف غير صالح' });
    }
    await prisma.workOrder.delete({ where: { id } });
    res.json({ message: 'تم حذف العمل' });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'العمل غير موجود' });
    }
    res.status(500).json({ error: 'حدث خطأ أثناء حذف العمل' });
  }
});

module.exports = router;