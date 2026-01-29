const db = require('../db/db');

function listOpsMessagesByUserId(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, user_id, subject, status, created_at
       FROM ops_messages
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC`,
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

function getOpsMessageById(messageId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, user_id, subject, status, body, created_at
       FROM ops_messages
       WHERE id = ?`,
      [messageId],
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

module.exports = { listOpsMessagesByUserId, getOpsMessageById };
