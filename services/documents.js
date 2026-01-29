const db = require('../db/db');

function getDocumentsByUserId(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, created_at, archived_at
       FROM documents
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
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

module.exports = { getDocumentsByUserId };
