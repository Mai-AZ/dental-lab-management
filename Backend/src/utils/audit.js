// تسجيل العمليات الحساسة (مثل الحذف) بجدول AuditLog
// لازم نمرّر الـ tx (transaction) حتى يكتب السجل ضمن نفس العملية:
// إما ينجح الحذف والسجل معاً، أو يفشلوا معاً.

// تحويل أي كائن (فيه Date مثلاً) لـ JSON عادي ليقبله Prisma
const toJson = (value) =>
  value === undefined || value === null ? null : JSON.parse(JSON.stringify(value));

async function logAudit(tx, req, { action, entity, entityId, before = null, after = null }) {
  const userId = req.session && req.session.userId;

  // الـ session بتخزّن userId بس، فنجيب اسم المستخدم من قاعدة البيانات
  let username = null;
  if (userId !== undefined && userId !== null) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    username = user ? user.username : null;
  }

  return tx.auditLog.create({
    data: {
      userId: userId !== undefined && userId !== null ? String(userId) : null,
      username,
      action,
      entity,
      entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
      before: toJson(before),
      after: toJson(after),
    },
  });
}

module.exports = { logAudit };