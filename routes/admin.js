const fs = require('fs');
const path = require('path');
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { getContactMessageById } = require('../services/contact-messages');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');

async function loadContactLogs(limit = 200) {
  try {
    const files = await fs.promises.readdir(dataDir);
    const logFiles = files
      .filter((file) => file.startsWith('contact_messages_') && file.endsWith('.log'))
      .sort()
      .slice(-3);

    const entries = [];
    for (const file of logFiles) {
      const content = await fs.promises.readFile(path.join(dataDir, file), 'utf8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch (err) {
          // Ignore malformed log lines.
        }
      }
    }

    entries.sort((a, b) => String(a.loggedAt || '').localeCompare(String(b.loggedAt || '')));
    if (entries.length > limit) {
      return entries.slice(entries.length - limit);
    }
    return entries;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const logs = await loadContactLogs();
    const flag = process.env.CTF_FLAG || 'FLAG{@dmin_log_viewer}';

    res.render('pages/admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      logs: logs.reverse(),
      flag
    });
  } catch (err) {
    console.error('Admin dashboard load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load the admin dashboard at this time.'
    });
  }
});

router.get('/messages/:id', requireRole(['admin']), async (req, res) => {
  const messageId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(messageId)) {
    res.status(404).render('pages/not-found', {
      title: 'Message Not Found'
    });
    return;
  }

  try {
    const message = await getContactMessageById(messageId);

    if (!message) {
      res.status(404).render('pages/not-found', {
        title: 'Message Not Found'
      });
      return;
    }

    res.render('pages/admin/message', {
      title: 'Contact Message',
      user: req.session.user,
      message
    });
  } catch (err) {
    console.error('Admin message load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load this message at this time.'
    });
  }
});

module.exports = router;
