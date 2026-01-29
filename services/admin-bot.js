const fs = require('fs');
const puppeteer = require('puppeteer');

function getBaseUrl() {
  const envBase = process.env.APP_BASE_URL;
  if (envBase) {
    return envBase.replace(/\/+$/, '');
  }
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || 'admin@nordicarchives.se',
    password: process.env.ADMIN_PASSWORD || 'AdminPass123!'
  };
}

function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function runAdminBot(messageId) {
  if (!messageId) {
    return;
  }

  const baseUrl = getBaseUrl();
  const { email, password } = getAdminCredentials();
  const loginUrl = `${baseUrl}/login`;
  const messageUrl = `${baseUrl}/admin/messages/${messageId}`;
  const totalTimeoutMs = Number.parseInt(process.env.ADMIN_BOT_TIMEOUT_MS || '15000', 10);

  const launchOptions = {
    headless: 'new'
  };

  const executablePath = getExecutablePath();
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  if (process.env.PUPPETEER_NO_SANDBOX === '1') {
    launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  page.on('dialog', async (dialog) => {
    try {
      await dialog.dismiss();
    } catch (err) {
      console.error('Admin bot dialog dismiss failed:', err.message);
    }
  });

  const runFlow = async () => {
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    await page.goto(messageUrl, { waitUntil: 'networkidle2' });

    const waitMs = Number.parseInt(process.env.ADMIN_BOT_WAIT_MS || '1500', 10);
    if (Number.isFinite(waitMs) && waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  };

  const runWithTimeout = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Admin bot timed out'));
      }, totalTimeoutMs);

      runFlow()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });

  try {
    await runWithTimeout();
  } finally {
    try {
      await browser.close();
    } catch (err) {
      console.error('Admin bot browser close failed:', err.message);
    }
  }
}

function queueAdminVisit(messageId) {
  setImmediate(() => {
    runAdminBot(messageId).catch((err) => {
      console.error('Admin bot failed:', err);
    });
  });
}

module.exports = { queueAdminVisit, runAdminBot };
