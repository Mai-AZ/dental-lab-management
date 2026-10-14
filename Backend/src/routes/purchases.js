const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// مهلة العملية: أطول من الافتراضي (5 ثوانٍ) لأن Neon قد تكون بطيئة،
// ولأن الطلب قد ينتظر القفل حتى تنتهي عملية ثانية على نفس المادة
const TX_OPTIONS = { maxWait: 10000, timeout: 15000 };

// قفل صف المادة حتى نهاية الـ transaction.
// أي عملية ثانية على نفس المادة تنتظر هنا، وبعدها تقرأ الكمية المحدّثة (يمنع فقدان التحديث)
const lockMaterial = (tx, materialId) =>
  tx.$queryRaw`SELECT id FROM "Material" WHERE id = ${materialId} FOR UPDATE`;

// GET /api/purchases - كل عمليات الشراء
router.get('/', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: { material: true },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(purchases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المشتريات' });
  }
});

// POST /api/purchases - إضافة عملية شراء + تحديث كمية المادة وسعر وحدتها تلقائياً
router.post('/', async (req, res) => {
  try {
    const { notes } = req.body;
    const materialId = Number(req.body.materialId);
    const quantity = Number(req.body.quantity);
    const totalPrice = Number(req.body.totalPrice);

    // فحص المدخلات
    if (!Number.isInteger(materialId) || materialId <= 0) {
      return res.status(400).json({ error: 'يجب اختيار المادة' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون رقماً أكبر من صفر' });
    }
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return res.status(400).json({ error: 'السعر الإجمالي يجب أن يكون رقماً صحيحاً' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) نقفل صف المادة أولاً، وبعدها فقط نقرأ الكمية
      await lockMaterial(tx, materialId);

      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) {
        const err = new Error('NOT_FOUND');
        err.code = 'MATERIAL_NOT_FOUND';
        throw err;
      }

      const purchase = await tx.purchase.create({
        data: { materialId, quantity, totalPrice, notes },
      });

      // الكمية الجديدة = القديمة + المشتراة
      const newQuantity = material.quantity + quantity;

      // سعر الوحدة = متوسط مرجّح بين قيمة المخزون القديم والشراء الجديد
      const newPricePerUnit =
        (material.quantity * material.pricePerUnit + totalPrice) / newQuantity;

      await tx.material.update({
        where: { id: materialId },
        data: { quantity: newQuantity, pricePerUnit: newPricePerUnit },
      });

      return purchase;
    }, TX_OPTIONS);

    res.status(201).json(result);
  } catch (error) {
    if (error.code === 'MATERIAL_NOT_FOUND') {
      return res.status(404).json({ error: 'المادة غير موجودة' });
    }
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الشراء' });
  }
});

// DELETE /api/purchases/:id - حذف عملية شراء + عكس أثرها على المخزون والسعر
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'رقم العملية غير صحيح' });
    }

    await prisma.$transaction(async (tx) => {
      // 1) نعرف أي مادة تخص هذه العملية (materialId ما بيتغيّر) حتى نقفلها
      const found = await tx.purchase.findUnique({
        where: { id },
        select: { materialId: true },
      });
      if (!found) {
        const err = new Error('NOT_FOUND');
        err.code = 'PURCHASE_NOT_FOUND';
        throw err;
      }

      // 2) نقفل صف المادة
      await lockMaterial(tx, found.materialId);

      // 3) نعيد قراءة العملية والمادة بعد القفل (قد تكون عملية ثانية حذفتها أو غيّرت الكمية)
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { material: true },
      });
      if (!purchase) {
        const err = new Error('NOT_FOUND');
        err.code = 'PURCHASE_NOT_FOUND';
        throw err;
      }

      const material = purchase.material;
      const newQuantity = material.quantity - purchase.quantity;

      // لا نسمح بالحذف إذا صارت الكمية سالبة
      if (newQuantity < -1e-9) {
        const err = new Error('NEGATIVE_STOCK');
        err.code = 'NEGATIVE_STOCK';
        throw err;
      }

      await tx.purchase.delete({ where: { id } });

      // نعيد حساب السعر من عمليات الشراء الباقية فعلياً (متوسط مرجّح = مجموع الأسعار ÷ مجموع الكميات).
      // هيك ما بيتراكم أي خطأ تقريبي مهما صار من إضافات وحذف.
      const remaining = await tx.purchase.aggregate({
        where: { materialId: material.id },
        _sum: { quantity: true, totalPrice: true },
      });
      const remainingQty = remaining._sum.quantity || 0;
      const remainingPrice = remaining._sum.totalPrice || 0;

      let newPricePerUnit;
      if (newQuantity <= 0) {
        newPricePerUnit = 0;
      } else if (remainingQty > 0) {
        newPricePerUnit = remainingPrice / remainingQty;
      } else {
        // احتياط: مخزون موجود بدون عمليات شراء مسجّلة (بيانات قديمة)، نستخدم الطريقة السابقة
        const remainingValue = Math.max(
          0,
          material.quantity * material.pricePerUnit - purchase.totalPrice
        );
        newPricePerUnit = remainingValue / newQuantity;
      }

      await tx.material.update({
        where: { id: material.id },
        data: {
          quantity: Math.max(0, newQuantity),
          pricePerUnit: newPricePerUnit,
        },
      });
    }, TX_OPTIONS);

    res.json({ success: true });
  } catch (error) {
    if (error.code === 'PURCHASE_NOT_FOUND') {
      return res.status(404).json({ error: 'عملية الشراء غير موجودة' });
    }
    if (error.code === 'NEGATIVE_STOCK') {
      return res.status(400).json({ error: 'لا يمكن حذف هذه العملية لأن كمية المادة الحالية أقل من الكمية المشتراة' });
    }
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف عملية الشراء' });
  }
});

module.exports = router;