const db = require('../db/db');

function recordAudit({ userId = null, action, detail = null, ipAddress = null }) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO audit_log (user_id, action, detail, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, detail, ipAddress],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

module.exports = { recordAudit };
