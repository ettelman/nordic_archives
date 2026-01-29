const express = require('express');

const router = express.Router();

const vaultCredentials = {
  username: 'k.andersson',
  password: 'xqrl42x7',
  vaultkey: 'nordicvault42secret'
};

function hasVaultAccess(req) {
  return Boolean(req.session && req.session.vaultAccess);
}

router.get('/vault', (req, res) => {
  res.render('pages/vault-login', {
    title: 'Vault Login',
    error: null,
    form: {
      username: '',
      vaultkey: ''
    }
  });
});

router.post('/vault', (req, res) => {
  const { username, password, vaultkey } = req.body;

  const isValid =
    username === vaultCredentials.username &&
    password === vaultCredentials.password &&
    vaultkey === vaultCredentials.vaultkey;

  if (!isValid) {
    res.status(401).render('pages/vault-login', {
      title: 'Vault Login',
      error: 'Invalid vault credentials.',
      form: {
        username: username || '',
        vaultkey: vaultkey || ''
      }
    });
    return;
  }

  req.session.vaultAccess = true;
  res.redirect('/vault/secure');
});

router.get('/vault/secure', (req, res) => {
  if (!hasVaultAccess(req)) {
    res.redirect('/vault');
    return;
  }

  res.render('pages/vault', {
    title: 'Vault',
    flag: process.env.VAULT_FLAG || 'FLAG{n0rdic_vault_@ccess}'
  });
});

module.exports = router;
