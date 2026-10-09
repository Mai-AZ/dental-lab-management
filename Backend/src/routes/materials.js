const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

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
    if (!name || !name.trim() || !unit || !unit.trim()) {
      return res.status(400).json({ error: 'اسم المادة والوحدة مطلوبان' });
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
        expiryDate: expiryDate ? new Date(expiryDate) : null,
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
    const id = Number(req.params.id);
    const { name, unit, alertThreshold, expiryDate } = req.body;

    // فحص المدخلات
    if (!name || !name.trim() || !unit || !unit.trim()) {
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
      data.expiryDate = expiryDate ? new Date(expiryDate) : null;
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
    const { id } = req.params;

    await prisma.material.delete({
      where: { id: Number(id) },
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