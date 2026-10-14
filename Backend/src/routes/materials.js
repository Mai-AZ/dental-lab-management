const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

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
  try {
    const allMaterials = await prisma.material.findMany();
    // المقارنة صارت هون بـ JavaScript لأن Prisma ما بيدعم مقارنة عمود بعمود مباشرة
    const lowStockMaterials = allMaterials.filter(
      (m) => m.quantity < m.alertThreshold
    );
    res.json(lowStockMaterials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المواد المنخفضة' });
  }
});

// GET /api/materials - جلب كل المواد
router.get('/', async (req, res) => {
  try {
    const materials = await prisma.material.findMany();
    res.json(materials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المواد' });
  }
});

// POST /api/materials - إضافة مادة جديدة
router.post('/', async (req, res) => {
  try {
    const { name, unit, alertThreshold, expiryDate } = req.body;

    // فحص المدخلات
    if (
      typeof name !== 'string' || typeof unit !== 'string' ||
      !name.trim() || !unit.trim()
    ) {
      return res.status(400).json({ error: 'اسم المادة والوحدة مطلوبان' });
    }

    const expiry = parseExpiryDate(expiryDate);
    if (!expiry.valid) {
      return res.status(400).json({ error: 'تاريخ الصلاحية غير صالح، استخدم الصيغة YYYY-MM-DD' });
    }

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
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'حدث خطأ أثناء إضافة المادة، تأكد من صحة البيانات' });
  }
});

// PUT /api/materials/:id - تعديل مادة موجودة
// ملاحظة: الكمية وسعر الوحدة لا يتعدلان من هنا، فقط من المشتريات
router.put('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'رقم المادة غير صحيح' });
    }

    const { name, unit, alertThreshold, expiryDate } = req.body;

    // فحص المدخلات
    if (
      typeof name !== 'string' || typeof unit !== 'string' ||
      !name.trim() || !unit.trim()
    ) {
      return res.status(400).json({ error: 'اسم المادة والوحدة مطلوبان' });
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
      if (!expiry.valid) {
        return res.status(400).json({ error: 'تاريخ الصلاحية غير صالح، استخدم الصيغة YYYY-MM-DD' });
      }
      data.expiryDate = expiry.date;
    }

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data,
    });

    res.json(updatedMaterial);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }
    res.status(400).json({ error: 'حدث خطأ أثناء تعديل المادة' });
  }
});

// DELETE /api/materials/:id - حذف مادة
router.delete('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'رقم المادة غير صحيح' });
    }

    await prisma.material.delete({
      where: { id },
    });

    res.json({ message: 'تم حذف المادة بنجاح' });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }
    // خطأ خاص: المادة مرتبطة بعمليات شراء، فما فينا نحذفها
    if (error.code === 'P2003' || (error.message && error.message.includes('foreign key'))) {
      return res.status(409).json({
        error: 'لا يمكن حذف هذه المادة لأنها مرتبطة بعمليات شراء مسجّلة. احذف عمليات الشراء المرتبطة بها أولاً إذا رغبت بحذفها.',
      });
    }
    res.status(400).json({ error: 'حدث خطأ أثناء حذف المادة' });
  }
});

module.exports = router;