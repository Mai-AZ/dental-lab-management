const express = require('express');
const ExcelJS = require('exceljs');
const prisma = require('../prismaClient');

const router = express.Router();

// تقريب لخانتين عشريتين (يتجنب أرقام مثل 10.200000000000001)
const round2 = (n) => Math.round(n * 100) / 100;
// تقريب الكميات لثلاث خانات (نفس تقريب المشتريات)
const round3 = (n) => Math.round(n * 1000) / 1000;

// تاريخ ووقت العملية بتوقيت دمشق بصيغة YYYY-MM-DD
// (السيرفر المنشور بيشتغل بتوقيت UTC، فنحدد المنطقة صراحةً حتى ما يطلع اليوم السابق)
const formatLocalDate = (d) =>
  d.toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });

// رد خطأ آمن: لا نحاول إرسال JSON إذا بدأ إرسال الملف فعلاً
function sendError(res, message) {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: message });
}

// حماية من حقن الصيغ (CSV/Formula Injection):
// أي نص يبدأ بـ = أو + أو - أو @ (أو tab/CR) ممكن Excel يعتبره صيغة.
// نضيف قبله ' فيضل نصاً عادياً. الأرقام والتواريخ ما بتتأثر.
const FORMULA_START = /^(\s*[=+\-@]|[\t\r])/;
const sanitizeCell = (v) =>
  typeof v === 'string' && FORMULA_START.test(v) ? `'${v}` : v;
const sanitizeRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, sanitizeCell(v)]));

// دالة مشتركة: تبني ملف Excel من أعمدة وصفوف وترسله للمتصفح
// rtl: الورقة تُعرض من اليمين لليسار (للعربي فقط)
async function sendExcel(res, { filename, sheetName, columns, rows, rtl }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: rtl }],
  });

  // columns: [{ header: 'اسم العمود', key: 'حقل', width: 20 }, ...]
  sheet.columns = columns;
  sheet.addRows(rows.map(sanitizeRow));

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
      sheetName: req.t('export.sheet.sales'),
      rtl: req.lang === 'ar',
      columns: [
        { header: req.t('export.col.doctor'), key: 'doctor', width: 22 },
        { header: req.t('export.col.service'), key: 'serviceType', width: 22 },
        { header: req.t('export.col.price'), key: 'price', width: 12 },
        { header: req.t('export.col.cost'), key: 'cost', width: 12 },
        { header: req.t('export.col.profit'), key: 'profit', width: 12 },
        { header: req.t('export.col.date'), key: 'saleDate', width: 14 },
        { header: req.t('export.col.notes'), key: 'notes', width: 30 },
      ],
      rows: sales.map((s) => ({
        doctor: s.doctor?.name ?? '',
        serviceType: s.serviceType,
        price: s.price,
        cost: s.cost,
        profit: round2(s.price - s.cost),
        saleDate: formatLocalDate(s.saleDate),
        notes: s.notes ?? '',
      })),
    });
  } catch (err) {
    console.error(err);
    sendError(res, req.t('export.sales.fail'));
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
      sheetName: req.t('export.sheet.purchases'),
      rtl: req.lang === 'ar',
      columns: [
        { header: req.t('export.col.material'), key: 'material', width: 24 },
        { header: req.t('export.col.quantity'), key: 'quantity', width: 12 },
        { header: req.t('export.col.unit'), key: 'unit', width: 12 },
        { header: req.t('export.col.total'), key: 'totalPrice', width: 14 },
        { header: req.t('export.col.date'), key: 'purchaseDate', width: 14 },
        { header: req.t('export.col.notes'), key: 'notes', width: 30 },
      ],
      rows: purchases.map((p) => ({
        material: p.material?.name ?? '',
        quantity: round3(p.quantity),
        unit: p.material?.unit ?? '',
        totalPrice: p.totalPrice,
        purchaseDate: formatLocalDate(p.purchaseDate),
        notes: p.notes ?? '',
      })),
    });
  } catch (err) {
    console.error(err);
    sendError(res, req.t('export.purchases.fail'));
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
      sheetName: req.t('export.sheet.materials'),
      rtl: req.lang === 'ar',
      columns: [
        { header: req.t('export.col.material'), key: 'name', width: 24 },
        { header: req.t('export.col.unit'), key: 'unit', width: 12 },
        { header: req.t('export.col.quantity'), key: 'quantity', width: 12 },
        { header: req.t('export.col.totalPrice'), key: 'totalPrice', width: 16 },
        { header: req.t('export.col.threshold'), key: 'alertThreshold', width: 12 },
        { header: req.t('export.col.expiry'), key: 'expiryDate', width: 16 },
      ],
      rows: materials.map((m) => ({
        name: m.name,
        unit: m.unit,
        quantity: round3(m.quantity),
        totalPrice: round2(m.quantity * m.pricePerUnit),
        alertThreshold: m.alertThreshold,
        // تاريخ الانتهاء مخزّن كتاريخ بدون وقت (منتصف ليل UTC)، فنقرأه بـ UTC
        expiryDate: m.expiryDate ? m.expiryDate.toISOString().slice(0, 10) : '',
      })),
    });
  } catch (err) {
    console.error(err);
    sendError(res, req.t('export.materials.fail'));
  }
});

module.exports = router;