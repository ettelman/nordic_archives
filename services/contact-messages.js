const db = require('../db/db');

function createContactMessage({ fullName, email, company, message }) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO contact_messages (full_name, email, company, message) VALUES (?, ?, ?, ?)',
      [fullName, email, company || '', message],
      function insertCallback(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      }
    );
  });
}

function getContactMessageById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, full_name, email, company, message, created_at
       FROM contact_messages
       WHERE id = ?`,
      [id],
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

module.exports = { createContactMessage, getContactMessageById };
