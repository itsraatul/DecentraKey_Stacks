// server/routes/siteRoutes.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('landing', {
    title: 'DecentraKey — NFT Licenses for Software',
  });
});

module.exports = router;
