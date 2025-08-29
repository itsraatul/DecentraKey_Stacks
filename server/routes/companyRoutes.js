// server/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Company = require('../models/Company');
const License = require('../models/License');

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CONTRACT_NAME    = process.env.CONTRACT_NAME;
const HIRO_API         = process.env.HIRO_API || 'https://api.testnet.hiro.so';


// --- protect company routes ---
const isCompany = (req, res, next) => {
  if (req.session && req.session.companyId) return next();
  res.redirect('/company/login');
};

// --- Registration ---
router.get('/register', (req, res) => {
  res.render('company-register', { title: 'Company Registration', error: null });
});

router.post('/register', async (req, res) => {
  const { companyName, email, password, stacksWalletAddress } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await Company.create({
      companyName,
      email,
      password: hashedPassword,
      stacksWalletAddress,
      status: 'pending', // reviewed/approved by admin later
    });
    res.redirect('/company/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('company-register', {
      title: 'Company Registration',
      error: 'Failed to register. Email or wallet may already be in use.',
    });
  }
});
router.get('/verify', async (req, res) => {
  return res.render('verify-license', {
    contractAddress: CONTRACT_ADDRESS || '',
    contractName: CONTRACT_NAME || '',
    hiroApi: process.env.HIRO_API || 'https://api.testnet.hiro.so',

  });
});

// --- Login ---
router.get('/login', (req, res) => {
  res.render('company-login', { title: 'Company Login', error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const company = await Company.findOne({ where: { email } });
    if (!company) {
      return res.render('company-login', { title: 'Company Login', error: 'Invalid credentials' });
    }
    if (company.status !== 'approved') {
      return res.render('company-login', { title: 'Company Login', error: 'Your account is not yet approved by the admin.' });
    }
    const ok = await bcrypt.compare(password, company.password);
    if (!ok) {
      return res.render('company-login', { title: 'Company Login', error: 'Invalid credentials' });
    }
    req.session.companyId = company.id;
    req.session.companyName = company.companyName;
    res.redirect('/company/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Server error during login.');
  }
});


// server/routes/companyRoutes.js (add near the other routes)
router.post('/create-license-from-wallet', isCompany, async (req, res) => {
  try {
    const {
      voucherId, customerName, customerEmail, customerWalletAddress,
      softwareName, licenseDurationDays, chainTxId
    } = req.body;

    if (!Number.isInteger(voucherId) || voucherId <= 0) {
      return res.status(400).json({ error: 'Invalid voucherId' });
    }

    // (Optional but recommended) verify voucher exists and is for that recipient
    const HIRO = process.env.HIRO_API || 'https://api.testnet.hiro.so';
    const uintToHex = (u) => {
      const n = BigInt(u); const b = new Uint8Array(17); b[0]=1;
      for (let i=16;i>=1;i--) b[i] = Number((n >> BigInt(8*(16-i))) & 0xffn);
      return '0x' + Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
    };
    const ro = await fetch(
      `${HIRO}/v2/contracts/call-read/${process.env.CONTRACT_ADDRESS}/${process.env.CONTRACT_NAME}/get-voucher`,
      { method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ sender: process.env.CONTRACT_ADDRESS, arguments: [uintToHex(voucherId)] })
      }
    ).then(r=>r.json()).catch(()=>null);

    // If you want to be stricter, decode and check recipient matches `customerWalletAddress`

    const crypto = require('crypto');
    const claimToken = crypto.randomBytes(20).toString('hex');

    await License.create({
      voucherId,
      customerName,
      customerEmail,
      customerWalletAddress,
      softwareName,
      licenseDurationDays: parseInt(licenseDurationDays, 10),
      claimToken,
      CompanyId: req.session.companyId,
      // not claimed yet; store the creation tx if you want:
      redeemTxId: null,
    });

    // cache link in session (like you do today)
    req.session.claimLink = `${req.protocol}://${req.get('host')}/claim/${claimToken}`;
    return res.json({ ok: true, claimLink: req.session.claimLink });
  } catch (e) {
    console.error('create-license-from-wallet failed:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});


// --- Dashboard ---
router.get('/dashboard', isCompany, async (req, res) => {
  try {
    const licenses = await License.findAll({ where: { CompanyId: req.session.companyId } });
    res.render('company-dashboard', {
      title: 'Company Dashboard',
      companyName: req.session.companyName,
      licenses,
      claimLink: req.session.claimLink || null,
      error: req.session.error || null,
      // 👇 add these
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      contractName: process.env.CONTRACT_NAME || '',
      hiroApi: process.env.HIRO_API || 'https://api.testnet.hiro.so',
    });
    delete req.session.claimLink;
    delete req.session.error;
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard.');
  }
});



// --- Create license (no blockchain here) ---
// POST /company/create-license
router.post('/create-license', isCompany, async (req, res) => {
  const { customerName, customerEmail, customerWalletAddress, softwareName, licenseDurationDays } = req.body;
  try {
    const { voucherId, txid } = await createVoucherOnChain({
      recipient: customerWalletAddress,
      softwareName,
      durationDays: parseInt(licenseDurationDays, 10),
    });

    const claimToken = crypto.randomBytes(20).toString('hex');

    await License.create({
      voucherId,
      customerName,
      customerEmail,
      customerWalletAddress,
      softwareName,
      licenseDurationDays: parseInt(licenseDurationDays, 10),
      claimToken,
      CompanyId: req.session.companyId,
    });

    req.session.claimLink = `${req.protocol}://${req.get('host')}/claim/${claimToken}`;
    res.redirect('/company/dashboard');
  } catch (error) {
    console.error('Failed to create license:', error);
    req.session.error = error.message || 'Failed to create license';
    res.redirect('/company/dashboard');
  }
});


// --- Optional: Dev helper to seed a test license and give you a claim link quickly ---
router.get('/dev-seed', isCompany, async (req, res) => {
  try {
    const voucherId = Math.floor(Math.random() * 1_000_000) + 1;
    const claimToken = crypto.randomBytes(20).toString('hex');

    await License.create({
      voucherId,
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      customerWalletAddress: 'ST2JVNDBYHEXN4THNQ2RFGG02JJZSSQM31MJVYWBR', // put your own testnet STX address here
      softwareName: 'Demo App',
      licenseDurationDays: 365,
      claimToken,
      CompanyId: req.session.companyId,
    });

    res.send(`Seeded. Open: <a href="/claim/${claimToken}">/claim/${claimToken}</a>`);
  } catch (e) {
    res.status(500).send('Failed to seed: ' + e.message);
  }
});

// --- REST: get license metadata by id (used by Verify page) ---
router.get('/api/licenses/lookup', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });
  const row = await License.findOne({ where: { voucherId: id } }); // voucherId === tokenId
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({
    softwareName: row.softwareName,
    licenseDurationDays: row.licenseDurationDays,
    redeemedAt: row.redeemedAt,
  });
});

// --- Logout ---
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect('/company/dashboard');
    res.clearCookie('connect.sid');
    res.redirect('/company/login');
  });
});

module.exports = router;
