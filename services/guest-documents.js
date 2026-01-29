const db = require('../db/db');

function listGuestDocuments() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, title, summary, format, created_at
       FROM guest_documents
       ORDER BY created_at DESC`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      }
    );
  });
}

function getGuestDocumentById(documentId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, title, summary, body, format, created_at
       FROM guest_documents
       WHERE id = ?`,
      [documentId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      }
    );
  });
}

module.exports = { listGuestDocuments, getGuestDocumentById };
