// server/routes/api.js
const router = require('express').Router();
const License = require('../models/License');

router.post('/licenses/mark-claimed', async (req, res) => {
  try {
    const { claimToken, txid } = req.body || {};
    if (!claimToken || !txid) return res.status(400).json({ ok:false, error:'missing inputs' });
    const lic = await License.findOne({ where: { claimToken }});
    if (!lic) return res.status(404).json({ ok:false, error:'license not found' });

    await lic.update({ isClaimed: true, redeemTxId: txid, redeemedAt: new Date() });
    return res.json({ ok:true });
  } catch (e) {
    console.error('mark-claimed failed:', e);
    return res.status(500).json({ ok:false, error:e.message });
  }
});

module.exports = router;
