function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  }
  next();
}

module.exports = requireAuth;