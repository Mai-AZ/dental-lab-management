const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const AppError = require('../utils/AppError');

const MAX_NAME_LENGTH = 100;
const PHONE_PATTERN = /^[0-9+\-()\s]{6,20}$/;

// GET /api/doctors - كل الأطباء (مرتبين بالاسم)
router.get('/', async (req, res) => {
  const doctors = await prisma.doctor.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(doctors);
});

// POST /api/doctors - إضافة طبيب جديد
router.post('/', async (req, res) => {
  const { name, phone } = req.body;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new AppError('doctors.nameRequired', 400);
  }
  const cleanName = name.trim();
  if (cleanName.length > MAX_NAME_LENGTH) {
    throw new AppError('doctors.nameTooLong', 400);
  }

  let cleanPhone = null;
  if (phone !== undefined && phone !== null && phone !== '') {
    if (typeof phone !== 'string') throw new AppError('doctors.phoneInvalid', 400);
    cleanPhone = phone.trim();
    if (cleanPhone !== '' && !PHONE_PATTERN.test(cleanPhone)) {
      throw new AppError('doctors.phoneInvalid', 400);
    }
    if (cleanPhone === '') cleanPhone = null;
  }

  const newDoctor = await prisma.doctor.create({
    data: { name: cleanName, phone: cleanPhone },
  });
  res.status(201).json(newDoctor);
});

module.exports = router;