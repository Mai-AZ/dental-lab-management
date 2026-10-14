const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { logAudit } = require('../utils/audit');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// تحقق صارم من تاريخ الصلاحية: لازم نص بصيغة YYYY-MM-DD وتاريخ حقيقي
// (يرفض الأرقام مثل 20251013، والنصوص الجزئية مثل "2026-10"، والتواريخ المستحيلة مثل 2026-02-31)
// الفاضي (undefined / null / '') = بدون تاريخ
const parseExpiryDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return { valid: true, date: null };
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { valid: false };
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // نتأكد إن التاريخ ما انقلب (مثلاً 2026-02-31 بيصير 2026-03-03)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { valid: false };
  }
  return { valid: true, date };
};

const parseId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const EXPIRY_ERROR = 'تاريخ الصلاحية غير صالح، استخدم الصيغة YYYY-MM-DD';

// GET /api/materials/low-stock - المواد يلي كميتها أقل من حد التنبيه
router.get('/low-stock', asyncHandler(async (req, res) => {
  const allMaterials = await prisma.material.findMany();
  // المقارنة صارت هون بـ JavaScript لأن Prisma ما بيدعم مقارنة عمود بعمود مباشرة
  res.json(allMaterials.filter((m) => m.quantity < m.alertThreshold));
}));

// GET /api/materials - جلب كل المواد
router.get('/', asyncHandler(async (req, res) => {
  const materials = await prisma.material.findMany();
  res.json(materials);
}));

// POST /api/materials - إضافة مادة جديدة
router.post('/', asyncHandler(async (req, res) => {
  const { name, unit, alertThreshold, expiryDate } = req.body;

  if (
    typeof name !== 'string' || typeof unit !== 'string' ||
    !name.trim() || !unit.trim()
  ) {
    throw new AppError('اسم المادة والوحدة مطلوبان', 400);
  }

  const expiry = parseExpiryDate(expiryDate);
  if (!expiry.valid) throw new AppError(EXPIRY_ERROR, 400);

  const threshold = Number(alertThreshold);

  const newMaterial = await prisma.material.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      // الكمية والسعر يبدآن من صفر ويتحدثان من المشتريات فقط
      quantity: 0,
      pricePerUnit: 0,
      alertThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 5,
      expiryDate: expiry.date,
    },
  });

  res.status(201).json(newMaterial);
}));

// PUT /api/materials/:id - تعديل مادة موجودة
// ملاحظة: الكمية وسعر الوحدة لا يتعدلان من هنا، فقط من المشتريات
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new AppError('رقم المادة غير صحيح', 400);

  const { name, unit, alertThreshold, expiryDate } = req.body;

  if (
    typeof name !== 'string' || typeof unit !== 'string' ||
    !name.trim() || !unit.trim()
  ) {
    throw new AppError('اسم المادة والوحدة مطلوبان', 400);
  }

  const threshold = Number(alertThreshold);

  const data = {
    name: name.trim(),
    unit: unit.trim(),
    alertThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 5,
  };

  // نعدّل تاريخ الصلاحية فقط إذا أُرسل بالطلب (حتى لا يُمسح بالغلط)
  if (expiryDate !== undefined) {
    const expiry = parseExpiryDate(expiryDate);
    if (!expiry.valid) throw new AppError(EXPIRY_ERROR, 400);
    data.expiryDate = expiry.date;
  }

  // لو المادة مو موجودة Prisma بيرمي P2025 والمعالج المركزي بيحوّله لـ 404
  const updatedMaterial = await prisma.material.update({ where: { id }, data });
  res.json(updatedMaterial);
}));

// DELETE /api/materials/:id - حذف مادة (مع تسجيلها بسجل التدقيق ضمن نفس الـ transaction)
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new AppError('رقم المادة غير صحيح', 400);

  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id } });
      if (!material) throw new AppError('المادة غير موجودة', 404);

      await tx.material.delete({ where: { id } });

      await logAudit(tx, req, {
        action: 'DELETE',
        entity: 'Material',
        entityId: id,
        before: material,
      });
    }, { maxWait: 10000, timeout: 15000 });
  } catch (error) {
    // المادة مرتبطة بعمليات شراء، فما فينا نحذفها
    if (error.code === 'P2003') {
      throw new AppError(
        'لا يمكن حذف هذه المادة لأنها مرتبطة بعمليات شراء مسجّلة. احذف عمليات الشراء المرتبطة بها أولاً إذا رغبت بحذفها.',
        409
      );
    }
    throw error;
  }

  res.json({ message: 'تم حذف المادة بنجاح' });
}));

module.exports = router;