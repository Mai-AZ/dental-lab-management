const prisma = require('./prismaClient');

async function main() {
  const doctor = await prisma.doctor.create({
    data: {
      name: 'د. أحمد',
      phone: '0599123456',
    },
  });

  console.log('تم إضافة الطبيب:', doctor);

  const sale = await prisma.sale.create({
    data: {
      doctorId: doctor.id,
      serviceType: 'تركيبة زيركون',
      price: 300,
      cost: 120,
      notes: 'طلب تجريبي',
    },
  });

  console.log('تم إضافة عملية البيع:', sale);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());