const express = require('express');
const ExcelJS = require('exceljs');
const prisma = require('../prismaClient');

const router = express.Router();

// دالة مشتركة: تبني ملف Excel من أعمدة وصفوف وترسله للمتصفح
async function sendExcel(res, { filename, sheetName, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  // rightToLeft: الورقة تُعرض من اليمين لليسار (مناسب للعربي)
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  // columns: [{ header: 'اسم العمود', key: 'حقل', width: 20 }, ...]
  sheet.columns = columns;
  sheet.addRows(rows);

  // ترويسة الجدول بخط عريض
  sheet.getRow(1).font = { bold: true };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  await workbook.xlsx.write(res);
  res.end();
}

// GET /api/export/sales
router.get('/sales', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { doctor: true },
      orderBy: { saleDate: 'desc' },
    });

    await sendExcel(res, {
      filename: 'sales.xlsx',
      sheetName: 'المبيعات',
      columns: [
        { header: 'الطبيب', key: 'doctor', width: 22 },
        { header: 'الخدمة', key: 'serviceType', width: 22 },
        { header: 'السعر', key: 'price', width: 12 },
        { header: 'التكلفة', key: 'cost', width: 12 },
        { header: 'الربح', key: 'profit', width: 12 },
        { header: 'التاريخ', key: 'saleDate', width: 14 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ],
      rows: sales.map((s) => ({
        doctor: s.doctor?.name ?? '',
        serviceType: s.serviceType,
        price: s.price,
        cost: s.cost,
        profit: s.price - s.cost,
        saleDate: s.saleDate.toISOString().slice(0, 10),
        notes: s.notes ?? '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تصدير المبيعات' });
  }
});

// GET /api/export/purchases
router.get('/purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: { material: true },
      orderBy: { purchaseDate: 'desc' },
    });

    await sendExcel(res, {
      filename: 'purchases.xlsx',
      sheetName: 'المشتريات',
      columns: [
        { header: 'المادة', key: 'material', width: 24 },
        { header: 'الكمية', key: 'quantity', width: 12 },
        { header: 'الوحدة', key: 'unit', width: 12 },
        { header: 'الإجمالي', key: 'totalPrice', width: 14 },
        { header: 'التاريخ', key: 'purchaseDate', width: 14 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ],
      rows: purchases.map((p) => ({
        material: p.material?.name ?? '',
        quantity: p.quantity,
        unit: p.material?.unit ?? '',
        totalPrice: p.totalPrice,
        purchaseDate: p.purchaseDate.toISOString().slice(0, 10),
        notes: p.notes ?? '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تصدير المشتريات' });
  }
});

// GET /api/export/materials
router.get('/materials', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' },
    });

    await sendExcel(res, {
      filename: 'materials.xlsx',
      sheetName: 'المخزون',
      columns: [
        { header: 'المادة', key: 'name', width: 24 },
        { header: 'الوحدة', key: 'unit', width: 12 },
        { header: 'الكمية', key: 'quantity', width: 12 },
        { header: 'سعر الوحدة', key: 'pricePerUnit', width: 14 },
        { header: 'حد التنبيه', key: 'alertThreshold', width: 12 },
        { header: 'تاريخ الانتهاء', key: 'expiryDate', width: 16 },
      ],
      rows: materials.map((m) => ({
        name: m.name,
        unit: m.unit,
        quantity: m.quantity,
        pricePerUnit: m.pricePerUnit,
        alertThreshold: m.alertThreshold,
        expiryDate: m.expiryDate ? m.expiryDate.toISOString().slice(0, 10) : '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تصدير المواد' });
  }
});

module.exports = router;
