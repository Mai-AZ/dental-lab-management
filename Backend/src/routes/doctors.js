const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/doctors - كل الأطباء
router.get('/', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany();
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
    const newDoctor = await prisma.doctor.create({
      data: { name, phone },
    });
    res.status(201).json(newDoctor);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'حدث خطأ أثناء إضافة الطبيب' });
  }
});

module.exports = router;