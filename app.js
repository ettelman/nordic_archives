const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { initDatabase } = require('./db/init');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const portalRoutes = require('./routes/portal');
const adminRoutes = require('./routes/admin');
const vaultRoutes = require('./routes/vault');

const app = express();
const dataDir = path.join(__dirname, 'data');

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

fs.mkdirSync(dataDir, { recursive: true });

app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: dataDir
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear();
  res.locals.company = {
    name: 'Nordic Archives'
  };
  res.locals.project = {
    author: 'ettelman'
  };
  res.locals.user = req.session.user || null;
  next();
});

app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', vaultRoutes);
app.use('/portal', portalRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('pages/not-found', {
    title: 'Page Not Found'
  });
});

initDatabase().catch((err) => {
  console.error('Database initialization failed:', err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Nordic Archives portal listening on port ${port}`);
});
