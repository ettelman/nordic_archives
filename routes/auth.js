const express = require('express');
const { authenticateUser, updateLastLogin } = require('../services/auth');
const { recordAudit } = require('../services/audit');

const router = express.Router();

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/portal');
    return;
  }

  res.render('pages/login', {
    title: 'Client Login',
    error: null
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await authenticateUser(email, password);

    if (!result.ok) {
      const errorMessage =
        result.error === 'inactive'
          ? 'Your account is currently inactive. Please contact support.'
          : 'Invalid email or password.';

      res.status(401).render('pages/login', {
        title: 'Client Login',
        error: errorMessage
      });
      return;
    }

    await regenerateSession(req);
    req.session.user = result.user;
    await updateLastLogin(result.user.id);
    await recordAudit({
      userId: result.user.id,
      action: 'login.success',
      detail: `User signed in as ${result.user.role}`,
      ipAddress: req.ip
    });

    res.redirect('/portal');
  } catch (err) {
    console.error('Authentication failed:', err);
    res.status(500).render('pages/login', {
      title: 'Client Login',
      error: 'Unable to complete sign-in at this time.'
    });
  }
});

router.get('/logout', async (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }

  const { id, role } = req.session.user;

  try {
    await recordAudit({
      userId: id,
      action: 'logout',
      detail: `User signed out (${role})`,
      ipAddress: req.ip
    });
    await destroySession(req);
  } catch (err) {
    console.error('Logout failed:', err);
  }

  res.redirect('/login');
});

module.exports = router;
