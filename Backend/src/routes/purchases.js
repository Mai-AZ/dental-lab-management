const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { logAudit } = require('../utils/audit');

// نفس سقف المبيعات (sales.js) حتى يكون التعامل مع الأرقام موحّداً
const MAX_AMOUNT = 1000000000;
const MAX_NOTES_LENGTH = 500;

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
    const rawNotes = req.body.notes;
    const materialId = Number(req.body.materialId);
    const rawQuantity = Number(req.body.quantity);
    const rawTotalPrice = Number(req.body.totalPrice);

    // فحص المدخلات
    if (!Number.isInteger(materialId) || materialId <= 0) {
      return res.status(400).json({ error: 'يجب اختيار المادة' });
    }
    if (!Number.isFinite(rawQuantity) || rawQuantity <= 0 || rawQuantity > MAX_AMOUNT) {
      return res.status(400).json({ error: 'الكمية يجب أن تكون رقماً أكبر من صفر وضمن الحد المسموح' });
    }
    if (!Number.isFinite(rawTotalPrice) || rawTotalPrice < 0 || rawTotalPrice > MAX_AMOUNT) {
      return res.status(400).json({ error: 'السعر الإجمالي يجب أن يكون رقماً صحيحاً ضمن الحد المسموح' });
    }

    // تقريب: السعر لخانتين عشريتين، والكمية لثلاث خانات (يمنع تراكم كسور غريبة)
    const quantity = Math.round(rawQuantity * 1000) / 1000;
    const totalPrice = Math.round(rawTotalPrice * 100) / 100;
    if (quantity <= 0) {
      return res.status(400).json({ error: 'الكمية صغيرة جداً (أقصى دقة 3 خانات عشرية)' });
    }

    let notes = null;
    if (rawNotes !== undefined && rawNotes !== null && rawNotes !== '') {
      if (typeof rawNotes !== 'string') {
        return res.status(400).json({ error: 'الملاحظات غير صالحة' });
      }
      notes = rawNotes.trim();
      if (notes.length > MAX_NOTES_LENGTH) {
        return res.status(400).json({ error: 'الملاحظات طويلة جداً' });
      }
      if (notes === '') notes = null;
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
      // (نقرّب لـ 3 خانات حتى لا تتراكم كسور مثل 0.30000000000000004)
      const newQuantity = Math.round((material.quantity + quantity) * 1000) / 1000;

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
      const newQuantity = Math.round((material.quantity - purchase.quantity) * 1000) / 1000;

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

      const finalQuantity = Math.max(0, newQuantity);

      await tx.material.update({
        where: { id: material.id },
        data: {
          quantity: finalQuantity,
          pricePerUnit: newPricePerUnit,
        },
      });

      // سجل التدقيق: مين حذف، شو كانت العملية، وكيف تغيّر المخزون والسعر
      const { material: _material, ...purchaseData } = purchase;
      await logAudit(tx, req, {
        action: 'DELETE',
        entity: 'Purchase',
        entityId: id,
        before: {
          purchase: purchaseData,
          material: {
            id: material.id,
            name: material.name,
            quantity: material.quantity,
            pricePerUnit: material.pricePerUnit,
          },
        },
        after: {
          material: {
            id: material.id,
            quantity: finalQuantity,
            pricePerUnit: newPricePerUnit,
          },
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