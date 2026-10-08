const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

const MAX_NAME_LENGTH = 100;
const PHONE_PATTERN = /^[0-9+\-()\s]{6,20}$/;

// GET /api/doctors - كل الأطباء (مرتبين بالاسم)
router.get('/', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأطباء' });
  }
});

// POST /api/doctors - إضافة طبيب جديد
router.post('/', async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'اسم الطبيب مطلوب' });
    }
    const cleanName = name.trim();
    if (cleanName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: 'اسم الطبيب طويل جداً' });
    }

    let cleanPhone = null;
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string') {
        return res.status(400).json({ error: 'رقم الهاتف غير صالح' });
      }
      cleanPhone = phone.trim();
      if (cleanPhone !== '' && !PHONE_PATTERN.test(cleanPhone)) {
        return res.status(400).json({ error: 'رقم الهاتف غير صالح' });
      }
      if (cleanPhone === '') cleanPhone = null;
    }

    const newDoctor = await prisma.doctor.create({
      data: { name: cleanName, phone: cleanPhone },
    });
    res.status(201).json(newDoctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة الطبيب' });
  }
});

module.exports = router;