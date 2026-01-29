const db = require('./db');
const { createUser } = require('../scripts/create_user');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

async function ensureColumns(table, columns) {
  const rows = await all(`PRAGMA table_info(${table})`);
  const existing = new Set(rows.map((row) => row.name));

  for (const column of columns) {
    if (!existing.has(column.name)) {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column.definition}`);
    }
  }
}

async function initDatabase() {
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client_user',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      checksum TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS guest_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ops_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await ensureColumns('users', [
    {
      name: 'role',
      definition: "role TEXT NOT NULL DEFAULT 'client_user'"
    },
    {
      name: 'active',
      definition: 'active INTEGER NOT NULL DEFAULT 1'
    },
    {
      name: 'last_login_at',
      definition: 'last_login_at TEXT'
    }
  ]);

  await ensureColumns('guest_documents', [
    {
      name: 'summary',
      definition: "summary TEXT NOT NULL DEFAULT ''"
    },
    {
      name: 'format',
      definition: "format TEXT NOT NULL DEFAULT 'text'"
    }
  ]);

  const guestDocCount = await get('SELECT COUNT(*) AS count FROM guest_documents');
  if (!guestDocCount || guestDocCount.count === 0) {
    const seedDocs = [
      {
        title: 'Guest access overview',
        summary: 'Scope of guest portal access and escalation contacts.',
        format: 'text',
        body:
          'Guest access provides limited visibility into service updates and approved reference materials. Document retrieval, uploads, and client record administration remain restricted.\n\nFor changes to your access level, contact your account manager or request a review through client services.'
      },
      {
        title: 'Retention service calendar',
        summary: 'Upcoming service checkpoints and reporting milestones.',
        format: 'text',
        body:
          'Quarterly retention reviews are scheduled during the first week of April, July, and October. Annual recovery validation is performed in December.\n\nClients will receive a summary report within five business days of each review cycle.'
      },
      {
        title: 'Email correspondence',
        summary: 'Internal correspondence',
        format: 'thread',
        body:
          'From: <redacted> <redacted@nordicarchives.se>\nTo: Client Services Team\nSubject: Password rotation follow-up\n\nFollowing up on the questions regarding password rotation. Your current password is Winter2021! and will be rotated at the end of the quarter. Please confirm that this credential is not shared.\n\nFrom: Redacted <redacted@nordicarchives.se>\nTo: <redacted>; Client Services Team\nSubject: Re: Password rotation follow-up\n\nAcknowledged. I will change password as usual. Thanks for the info.'
      }
    ];

    for (const doc of seedDocs) {
      await run(
        'INSERT INTO guest_documents (title, summary, body, format) VALUES (?, ?, ?, ?)',
        [doc.title, doc.summary, doc.body, doc.format]
      );
    }
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nordicarchives.se').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const adminFullName = process.env.ADMIN_FULL_NAME || 'Nordic Admin';

  try {
    const result = await createUser({
      email: adminEmail,
      fullName: adminFullName,
      role: 'admin',
      password: adminPassword
    });

    if (!result.ok && result.error !== 'exists') {
      console.error('Admin seed failed:', result.error);
    }
  } catch (err) {
    console.error('Admin seed failed:', err.message);
  }

  try {
    await run('UPDATE users SET role = ?, active = 1 WHERE email = ?', ['admin', adminEmail]);
  } catch (err) {
    console.error('Admin role enforcement failed:', err.message);
  }

  const employeeSeeds = [
    {
      email: 'sofia.ek@nordicarchives.se',
      fullName: 'Sofia Ek',
      role: 'ops_user',
      password: 'Winter2025!'
    },
    {
      email: 'jonas.berg@nordicarchives.se',
      fullName: 'Jonas Berg',
      role: 'ops_user',
      password: 'Nordic2025!'
    },
    {
      email: 'oskar.nyman@nordicarchives.se',
      fullName: 'Oskar Nyman',
      role: 'ops_user',
      password: 'Archive2025!'
    }
  ];

  for (const employee of employeeSeeds) {
    try {
      const result = await createUser(employee);
      if (!result.ok && result.error !== 'exists') {
        console.error('Employee seed failed:', employee.email, result.error);
      }
    } catch (err) {
      console.error('Employee seed failed:', employee.email, err.message);
    }
  }

  try {
    const result = await createUser({
      email: process.env.GUEST_EMAIL || 'guest@nordicarchives.se',
      fullName: process.env.GUEST_FULL_NAME || 'Guest User',
      role: 'guest_user',
      password: process.env.GUEST_PASSWORD || 'Guest2025!'
    });

    if (!result.ok && result.error !== 'exists') {
      console.error('Guest seed failed:', result.error);
    }
  } catch (err) {
    console.error('Guest seed failed:', err.message);
  }

  const opsMessageCount = await get('SELECT COUNT(*) AS count FROM ops_messages');
  if (!opsMessageCount || opsMessageCount.count === 0) {
    const userLookup = async (email) => {
      const row = await get('SELECT id FROM users WHERE email = ?', [email]);
      return row ? row.id : null;
    };

    const opsMessageSeeds = [
      {
        email: 'sofia.ek@nordicarchives.se',
        subject: 'Retention exception review · FjordBank',
        status: 'Open',
        body:
          'FjordBank requested a 90-day extension on the Q2 retention hold. Please review the exception request, confirm legal sign-off, and update the retention ledger.'
      },
      {
        email: 'sofia.ek@nordicarchives.se',
        subject: 'Client audit follow-up · NordRail',
        status: 'In Progress',
        body:
          'NordRail audit notes require updated access attestations. Coordinate with compliance to gather the signed attestations and upload to the audit workspace.'
      },
      {
        email: 'jonas.berg@nordicarchives.se',
        subject: 'Onboarding handover · Borealis Health',
        status: 'Open',
        body:
          'Finalize onboarding checklist and confirm data ingestion schedule with Borealis Health. Client expects a timeline before Friday.'
      },
      {
        email: 'jonas.berg@nordicarchives.se',
        subject: 'Client escalation recap · Arcadia Logistics',
        status: 'Waiting',
        body:
          'Summarize escalation call notes, capture outstanding actions, and share with account manager before close of business.'
      },
      {
        email: 'oskar.nyman@nordicarchives.se',
        subject: 'Access review · Q3 privileged accounts',
        status: 'Open',
        body:
          'Review Q3 privileged access list, confirm removal of expired credentials, and document any exceptions.'
      },
      {
        email: 'oskar.nyman@nordicarchives.se',
        subject: 'Security assessment prep · Vault SOC',
        status: 'In Progress',
        body:
          'Prepare evidence pack for upcoming SOC review. Ensure log exports and anomaly reports are attached. Check if github account is empty or is vaultkey still there?'
      },
      {
        email: 'oskar.nyman@nordicarchives.se',
        subject: 'Credential rotation confirmation',
        status: 'Waiting',
        body:
          'As part of the quarterly access review, please confirm your access to the vault has been updated. Temporary access password: xqrl42x7. If you encounter issues, contact the security program lead.'
      }
    ];

    for (const seed of opsMessageSeeds) {
      const userId = await userLookup(seed.email);
      if (!userId) {
        continue;
      }
      await run(
        'INSERT INTO ops_messages (user_id, subject, status, body) VALUES (?, ?, ?, ?)',
        [userId, seed.subject, seed.status, seed.body]
      );
    }
  }
}

module.exports = { initDatabase };
