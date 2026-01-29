const fs = require('fs');
const path = require('path');
const express = require('express');
const { createContactMessage } = require('../services/contact-messages');
const { queueAdminVisit } = require('../services/admin-bot');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');

fs.mkdirSync(dataDir, { recursive: true });

function logContactMessage(entry) {
  const timestamp = new Date();
  const dateStamp = timestamp.toISOString().slice(0, 10);
  const logPath = path.join(dataDir, `contact_messages_${dateStamp}.log`);
  const payload = {
    ...entry,
    loggedAt: timestamp.toISOString()
  };

  fs.appendFile(logPath, `${JSON.stringify(payload)}\n`, (err) => {
    if (err) {
      console.error('Failed to write contact log:', err);
    }
  });
}

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'Secure Document Archiving'
  });
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /guest_access_nordic\n');
});

router.get('/services', (req, res) => {
  res.render('pages/services', {
    title: 'Services'
  });
});

router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About'
  });
});

router.get('/contact', (req, res) => {
  res.render('pages/contact', {
    title: 'Contact',
    notice: null,
    form: {
      fullName: '',
      email: '',
      company: '',
      message: ''
    }
  });
});

router.get('/guest_access_nordic', (req, res) => {
  res.render('pages/guest-access', {
    title: 'Guest Access',
    credentials: {
      email: process.env.GUEST_EMAIL || 'guest@nordicarchives.se',
      password: process.env.GUEST_PASSWORD || 'Guest2025!'
    }
  });
});

router.post('/contact', async (req, res) => {
  const { fullName, email, company, message } = req.body;

  try {
    const messageId = await createContactMessage({
      fullName,
      email,
      company,
      message
    });
    logContactMessage({
      id: messageId,
      fullName,
      email,
      company,
      message,
      ipAddress: req.ip
    });
    queueAdminVisit(messageId);
  } catch (err) {
    console.error('Failed to store contact message:', err);
  }

  res.render('pages/contact', {
    title: 'Contact',
    notice: 'Thank you for contacting Nordic Archives. Our team will respond within one business day.',
    form: {
      fullName: '',
      email: '',
      company: '',
      message: ''
    }
  });
});

module.exports = router;
