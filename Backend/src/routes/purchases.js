const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

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

// POST /api/purchases - إضافة عملية شراء + تحديث المخزون تلقائياً
router.post('/', async (req, res) => {
  try {
    const { materialId, quantity, totalPrice, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          materialId: Number(materialId),
          quantity,
          totalPrice,
          notes,
        },
      });

      await tx.material.update({
        where: { id: Number(materialId) },
        data: { quantity: { increment: quantity } },
      });

      return purchase;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'حدث خطأ أثناء تسجيل الشراء' });
  }
});

module.exports = router;