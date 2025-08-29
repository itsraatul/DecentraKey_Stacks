// server/index.js
require('dotenv').config();

const express  = require('express');
const path     = require('path');
const session  = require('express-session');
const sequelize = require('./database');

const siteRoutes    = require('./routes/siteRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const companyRoutes = require('./routes/companyRoutes');

// DB models
const Company = require('./models/Company');
const License = require('./models/License');

const app  = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Middleware -------------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets (favicon, js, css, images)
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(
  session({
    secret: 'a-very-secret-key-for-the-hackathon',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Make env-based values available in ALL views
if (!process.env.CONTRACT_ADDRESS || !process.env.CONTRACT_NAME) {
  console.warn('⚠️ CONTRACT_ADDRESS or CONTRACT_NAME missing in .env — claim/verify flows may break.');
}
app.use((req, res, next) => {
  res.locals.contractAddress = process.env.CONTRACT_ADDRESS || '';
  res.locals.contractName    = process.env.CONTRACT_NAME    || '';
  res.locals.hiroApi         = process.env.HIRO_API         || 'https://api.testnet.hiro.so';
  next();
});

// Quiet the favicon 404 if you haven’t added /public/favicon.ico yet
app.get('/favicon.ico', (req, res) => {
  const file = path.join(__dirname, 'public', 'favicon.ico');
  res.sendFile(file, err => {
    if (err) res.status(204).end(); // no content fallback
  });
});

/* -------------------- APIs -------------------- */
// Mark license as claimed after successful on-chain tx
app.post('/api/licenses/mark-claimed', async (req, res) => {
  try {
    const { claimToken, txid } = req.body;
    if (!claimToken) return res.status(400).json({ ok: false, error: 'Missing claimToken' });

    const license = await License.findOne({ where: { claimToken } });
    if (!license) return res.status(404).json({ ok: false, error: 'License not found' });

    if (license.isClaimed) {
      if (!license.redeemTxId && txid) {
        license.redeemTxId = txid;
        await license.save();
      }
      return res.status(200).json({ ok: true, already: true });
    }

    license.isClaimed  = true;
    if (txid) license.redeemTxId = txid;
    license.redeemedAt = new Date();
    await license.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error('mark-claimed error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

/* -------------------- Public routes FIRST -------------------- */
// Landing & marketing pages
app.use('/', siteRoutes);

// Claim page (public)
app.get('/claim/:claimToken', async (req, res) => {
  try {
    const { claimToken } = req.params;
    const license = await License.findOne({ where: { claimToken } });
    if (!license) return res.status(404).send('<h1>Invalid or expired claim link.</h1>');

    // You *may* let already-claimed still render (to show txid), but your current UX blocks it:
    // if (license.isClaimed) return res.status(400).send('<h1>This license has already been claimed.</h1>');

    const contractAddress = process.env.CONTRACT_ADDRESS || 'ST2JVNDBYHEXN4THNQ2RFGG02JJZSSQM31MJVYWBR';
    const contractName    = process.env.CONTRACT_NAME    || 'decentrakey-mvp';

    res.render('claim-license', {
      title: 'Claim Your Software License',
      license,
      contractAddress,
      contractName,
    });
  } catch (error) {
    console.error('Claim page error:', error);
    res.status(500).send('<h1>Error loading claim page.</h1>');
  }
});

// Dummy software page (public)
app.get('/dummy-software', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dummy-software.html'));
});

/* -------------------- Scoped / protected routes AFTER -------------------- */
app.use('/admin', adminRoutes);
app.use('/company', companyRoutes);

app.get('/api/licenses/lookup', async (req, res) => {
  try {
    const id = parseInt(req.query.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid id' });
    }

    const lic = await License.findOne({ where: { voucherId: id } });
    if (!lic) return res.json({}); // frontend will fallback to "Unknown"

    return res.json({
      softwareName: lic.softwareName,
      licenseDurationDays: lic.licenseDurationDays,
      redeemedAt: lic.redeemedAt,
      customerName: lic.customerName,
      customerEmail: lic.customerEmail,
    });
  } catch (e) {
    console.error('lookup error', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

/* -------------------- Server start -------------------- */
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    await sequelize.sync({ alter: true });
    console.log('✅ All models were synchronized successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database or start the server:', error);
  }
}

startServer();
