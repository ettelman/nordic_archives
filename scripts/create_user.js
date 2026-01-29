const bcrypt = require('bcrypt');
const db = require('../db/db');

const allowedRoles = new Set(['guest_user', 'client_user', 'ops_user', 'admin']);

function getUserTableColumns() {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(users)', [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

async function createUser({ email, fullName, role, password }) {
  if (!email || !fullName || !role || !password) {
    return { ok: false, error: 'missing_fields' };
  }

  if (!allowedRoles.has(role)) {
    return { ok: false, error: 'invalid_role' };
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return { ok: false, error: 'exists' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const columns = await getUserTableColumns();
  const hasPasswordSalt = columns.some((column) => column.name === 'password_salt');

  const fields = ['email', 'full_name', 'password_hash', 'role', 'active'];
  const values = [normalizedEmail, fullName, passwordHash, role, 1];

  if (hasPasswordSalt) {
    fields.push('password_salt');
    values.push('');
  }

  const placeholders = fields.map(() => '?').join(', ');

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`,
      values,
      (insertErr) => {
        if (insertErr) {
          reject(insertErr);
          return;
        }
        resolve();
      }
    );
  });

  return { ok: true };
}

function closeDb(code) {
  db.close(() => {
    process.exit(code);
  });
}

async function runFromCli() {
  const [email, fullName, role, password] = process.argv.slice(2);

  if (!email || !fullName || !role || !password) {
    console.error('Usage: node scripts/create_user.js <email> <fullName> <role> <password>');
    closeDb(1);
    return;
  }

  if (!allowedRoles.has(role)) {
    console.error(`Role must be one of: ${Array.from(allowedRoles).join(', ')}`);
    closeDb(1);
    return;
  }

  try {
    const result = await createUser({ email, fullName, role, password });
    if (!result.ok) {
      if (result.error === 'exists') {
        console.error('A user with this email already exists.');
      } else if (result.error === 'invalid_role') {
        console.error(`Role must be one of: ${Array.from(allowedRoles).join(', ')}`);
      } else {
        console.error('Missing required fields.');
      }
      closeDb(1);
      return;
    }

    console.log('User created successfully.');
    closeDb(0);
  } catch (err) {
    console.error('Failed to create user:', err.message);
    closeDb(1);
  }
}

if (require.main === module) {
  runFromCli();
}

module.exports = { createUser };
