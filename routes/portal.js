const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getDocumentsByUserId } = require('../services/documents');
const { listGuestDocuments, getGuestDocumentById } = require('../services/guest-documents');
const { listOpsMessagesByUserId, getOpsMessageById } = require('../services/ops-messages');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const user = req.session.user;

  try {
    if (user.role === 'guest_user') {
      const documents = await listGuestDocuments();
      res.render('pages/portal/dashboard-guest', {
        title: 'Portal Dashboard',
        user,
        documents: documents.slice(0, 4)
      });
      return;
    }

    if (user.role === 'client_user') {
      const documents = await getDocumentsByUserId(user.id);
      res.render('pages/portal/dashboard-client', {
        title: 'Client Dashboard',
        user,
        documents: documents.slice(0, 5)
      });
      return;
    }

    if (user.role === 'ops_user' || user.role === 'admin') {
      const messages = await listOpsMessagesByUserId(user.id);
      const summary = messages.reduce(
        (acc, message) => {
          acc.total += 1;
          const status = String(message.status || '').toLowerCase();
          if (status === 'open') {
            acc.open += 1;
          } else if (status === 'in progress') {
            acc.inProgress += 1;
          } else if (status === 'waiting') {
            acc.waiting += 1;
          } else {
            acc.other += 1;
          }
          return acc;
        },
        {
          total: 0,
          open: 0,
          inProgress: 0,
          waiting: 0,
          other: 0
        }
      );
      res.render('pages/portal/dashboard-ops', {
        title: 'Operations Dashboard',
        user,
        messages: messages.slice(0, 4),
        summary
      });
      return;
    }

    res.status(403).render('pages/forbidden', {
      title: 'Access Restricted'
    });
  } catch (err) {
    console.error('Portal dashboard failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load the portal dashboard at this time.'
    });
  }
});

router.get('/client', requireRole(['client_user']), async (req, res) => {
  const user = req.session.user;
  try {
    const documents = await getDocumentsByUserId(user.id);

    res.render('pages/portal/client', {
      title: 'Client Documents',
      user,
      documents
    });
  } catch (err) {
    console.error('Client document load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load your documents at this time.'
    });
  }
});

router.get('/guest/documents', requireRole(['guest_user']), async (req, res) => {
  try {
    const documents = await listGuestDocuments();
    res.render('pages/portal/guest-documents', {
      title: 'Guest Documents',
      user: req.session.user,
      documents
    });
  } catch (err) {
    console.error('Guest documents load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load guest documents at this time.'
    });
  }
});

router.get('/guest/documents/:id', requireRole(['guest_user']), async (req, res) => {
  const documentId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(documentId)) {
    res.status(404).render('pages/not-found', {
      title: 'Document Not Found'
    });
    return;
  }

  try {
    const document = await getGuestDocumentById(documentId);

    if (!document) {
      res.status(404).render('pages/not-found', {
        title: 'Document Not Found'
      });
      return;
    }

    res.render('pages/portal/guest-document', {
      title: document.title,
      user: req.session.user,
      document
    });
  } catch (err) {
    console.error('Guest document load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load this document at this time.'
    });
  }
});

router.get('/ops', requireRole(['ops_user', 'admin']), async (req, res) => {
  try {
    const user = req.session.user;
    const messages = await listOpsMessagesByUserId(user.id);
    const summary = messages.reduce(
      (acc, message) => {
        acc.total += 1;
        const status = String(message.status || '').toLowerCase();
        if (status === 'open') {
          acc.open += 1;
        } else if (status === 'in progress') {
          acc.inProgress += 1;
        } else if (status === 'waiting') {
          acc.waiting += 1;
        } else {
          acc.other += 1;
        }
        return acc;
      },
      {
        total: 0,
        open: 0,
        inProgress: 0,
        waiting: 0,
        other: 0
      }
    );

    res.render('pages/portal/ops', {
      title: 'Operations Dashboard',
      user,
      messages,
      summary
    });
  } catch (err) {
    console.error('Ops dashboard load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load the operations dashboard at this time.'
    });
  }
});

router.get('/ops/messages/:id', requireRole(['ops_user', 'admin']), async (req, res) => {
  const messageId = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(messageId)) {
    res.status(404).render('pages/not-found', {
      title: 'Message Not Found'
    });
    return;
  }

  try {
    const message = await getOpsMessageById(messageId);

    if (!message) {
      res.status(404).render('pages/not-found', {
        title: 'Message Not Found'
      });
      return;
    }

    res.render('pages/portal/ops-message', {
      title: 'Operations Message',
      user: req.session.user,
      message
    });
  } catch (err) {
    console.error('Ops message load failed:', err);
    res.status(500).render('pages/error', {
      title: 'Service Unavailable',
      message: 'We are unable to load this message at this time.'
    });
  }
});

module.exports = router;
