const bcrypt = require('bcrypt');
const db = require('../db/db');

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, email, full_name, password_hash, role, active FROM users WHERE email = ?',
      [email],
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

function updateLastLogin(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
      [userId],
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

async function authenticateUser(email, password) {
  if (!email || !password) {
    return { ok: false, error: 'invalid' };
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await getUserByEmail(normalizedEmail);

  if (!user || !user.password_hash) {
    return { ok: false, error: 'invalid' };
  }

  if (Number(user.active) !== 1) {
    return { ok: false, error: 'inactive' };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return { ok: false, error: 'invalid' };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    }
  };
}

module.exports = { authenticateUser, updateLastLogin };
