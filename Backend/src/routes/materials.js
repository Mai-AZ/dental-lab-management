const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { logAudit } = require('../utils/audit');
const AppError = require('../utils/AppError');

// ملاحظة: Express 5 بيمرّر تلقائياً أي خطأ من دوال async للمعالج المركزي،
// فما منحتاج try/catch ولا asyncHandler. بنرمي AppError('مفتاح الرسالة', الحالة)

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

// GET /api/materials/low-stock - المواد يلي كميتها أقل من حد التنبيه
router.get('/low-stock', async (req, res) => {
  const allMaterials = await prisma.material.findMany();
  // المقارنة صارت هون بـ JavaScript لأن Prisma ما بيدعم مقارنة عمود بعمود مباشرة
  res.json(allMaterials.filter((m) => m.quantity < m.alertThreshold));
});

// GET /api/materials - جلب كل المواد
router.get('/', async (req, res) => {
  const materials = await prisma.material.findMany();
  res.json(materials);
});

// POST /api/materials - إضافة مادة جديدة
router.post('/', async (req, res) => {
  const { name, unit, alertThreshold, expiryDate } = req.body;

  if (
    typeof name !== 'string' || typeof unit !== 'string' ||
    !name.trim() || !unit.trim()
  ) {
    throw new AppError('materials.nameUnitRequired', 400);
  }

  const expiry = parseExpiryDate(expiryDate);
  if (!expiry.valid) throw new AppError('materials.expiryInvalid', 400);

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
});

// PUT /api/materials/:id - تعديل مادة موجودة
// ملاحظة: الكمية وسعر الوحدة لا يتعدلان من هنا، فقط من المشتريات
router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new AppError('materials.invalidId', 400);

  const { name, unit, alertThreshold, expiryDate } = req.body;

  if (
    typeof name !== 'string' || typeof unit !== 'string' ||
    !name.trim() || !unit.trim()
  ) {
    throw new AppError('materials.nameUnitRequired', 400);
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
    if (!expiry.valid) throw new AppError('materials.expiryInvalid', 400);
    data.expiryDate = expiry.date;
  }

  // لو المادة مو موجودة Prisma بيرمي P2025 والمعالج المركزي بيحوّله لـ 404
  const updatedMaterial = await prisma.material.update({ where: { id }, data });
  res.json(updatedMaterial);
});

// DELETE /api/materials/:id - حذف مادة (مع تسجيلها بسجل التدقيق ضمن نفس الـ transaction)
router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) throw new AppError('materials.invalidId', 400);

  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id } });
      if (!material) throw new AppError('materials.notFound', 404);

      // المادة مرتبطة بعمليات شراء؟ نفحص قبل الحذف بدل ما ننتظر خطأ قاعدة البيانات
      const purchasesCount = await tx.purchase.count({ where: { materialId: id } });
      if (purchasesCount > 0) throw new AppError('materials.hasPurchases', 409);

      await tx.material.delete({ where: { id } });

      await logAudit(tx, req, {
        action: 'DELETE',
        entity: 'Material',
        entityId: id,
        before: material,
      });
    }, { maxWait: 10000, timeout: 15000 });
  } catch (error) {
    // احتياط (سباق نادر): لو انضافت عملية شراء بين الفحص والحذف.
    // قاعدة البيانات بترجّع خطأ RESTRICT (23001) وPrisma ما بيحوّله لـ P2003 داخل الـ transaction،
    // فمنتعرف عليه من نص الرسالة كمان
    if (error.code === 'P2003' || /violates (RESTRICT|foreign key)/i.test(error.message || '')) {
      throw new AppError('materials.hasPurchases', 409);
    }
    throw error;
  }

  res.json({ message: req.t('materials.deleted') });
});

module.exports = router;