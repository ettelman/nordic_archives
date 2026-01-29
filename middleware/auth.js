function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
    return;
  }

  res.redirect('/login');
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      res.redirect('/login');
      return;
    }

    if (!roles.includes(req.session.user.role)) {
      res.status(403).render('pages/forbidden', {
        title: 'Access Restricted'
      });
      return;
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
