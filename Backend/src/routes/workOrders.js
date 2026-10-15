const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { logAudit } = require('../utils/audit');
const AppError = require('../utils/AppError');

// القيم مخزّنة بالعربي بالقاعدة، والفرونت بيترجم العرض فقط
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

// تحقق صارم: لازم نص بصيغة YYYY-MM-DD وتاريخ حقيقي
// (يرفض "2026-10" والأرقام والتواريخ المستحيلة مثل 2026-02-31)
const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
};

// GET /api/work-orders/types - قائمة أنواع الأعمال (مصدر واحد للباك والفرونت)
router.get('/types', (req, res) => {
  res.json(WORK_TYPES);
});

router.get('/', async (req, res) => {
  const orders = await prisma.workOrder.findMany({
    include: { doctor: true },
    orderBy: { receivedDate: 'desc' },
  });
  res.json(orders);
});

router.post('/', async (req, res) => {
  const { doctorId, teeth, workType, color, receivedDate, deliveryDate } = req.body;

  const doctorIdNum =
    typeof doctorId === 'number' || typeof doctorId === 'string'
      ? parseId(doctorId)
      : null;
  if (!doctorIdNum) throw new AppError('workOrders.doctorRequired', 400);

  if (!Array.isArray(teeth) || teeth.length === 0) {
    throw new AppError('workOrders.teethRequired', 400);
  }
  if (teeth.length > MAX_TEETH) throw new AppError('workOrders.teethTooMany', 400);
  if (!teeth.every((t) => typeof t === 'string' && TOOTH_PATTERN.test(t))) {
    throw new AppError('workOrders.toothInvalid', 400);
  }

  if (!WORK_TYPES.includes(workType)) throw new AppError('workOrders.typeInvalid', 400);

  let cleanColor = null;
  if (color !== undefined && color !== null && color !== '') {
    if (typeof color !== 'string') throw new AppError('workOrders.colorInvalid', 400);
    cleanColor = color.trim();
    if (cleanColor.length > MAX_COLOR_LENGTH) {
      throw new AppError('workOrders.colorTooLong', 400);
    }
    if (cleanColor === '') cleanColor = null;
  }

  const received = parseDate(receivedDate);
  if (!received) throw new AppError('workOrders.receivedInvalid', 400);

  let delivery = null;
  if (deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== '') {
    delivery = parseDate(deliveryDate);
    if (!delivery) throw new AppError('workOrders.deliveryInvalid', 400);
    if (delivery < received) throw new AppError('workOrders.deliveryBeforeReceived', 400);
  }

  try {
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
    // P2003 = الطبيب المحدد غير موجود (مفتاح أجنبي)
    if (error.code === 'P2003') throw new AppError('workOrders.doctorNotFound', 400);
    throw error;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new AppError('common.invalidId', 400);

  await prisma.$transaction(async (tx) => {
    const order = await tx.workOrder.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!order) throw new AppError('workOrders.notFound', 404);

    await tx.workOrder.delete({ where: { id } });

    await logAudit(tx, req, {
      action: 'DELETE',
      entity: 'WorkOrder',
      entityId: id,
      before: order,
    });
  }, { maxWait: 10000, timeout: 15000 });

  res.json({ message: req.t('workOrders.deleted') });
});

module.exports = router;