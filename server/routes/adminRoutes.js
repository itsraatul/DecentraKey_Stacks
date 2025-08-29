// server/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
// We will create this helper file for blockchain interactions later
// const { authorizeCompanyOnChain } = require('../utils/stacks');

// --- Middleware to protect admin routes ---
const isAdmin = (req, res, next) => {
  // For this hackathon, we'll use a simple check.
  // In a real app, you'd have a full admin auth system.
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
};

// --- Admin Login Routes ---

// GET /admin/login - Display the admin login page
router.get('/login', (req, res) => {
  // We'll create the 'admin-login.ejs' file in the next step
  res.render('admin-login', { title: 'Admin Login', error: null });
});

// POST /admin/login - Handle admin login attempt
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // IMPORTANT: For a hackathon, we are hardcoding the admin credentials.
  // In a real-world application, these should be stored securely as environment variables.
  if (username === 'admin' && password === 'password123') {
    req.session.isAdmin = true; // Set the session variable
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin-login', {
      title: 'Admin Login',
      error: 'Invalid username or password',
    });
  }
});

// --- Admin Dashboard ---

// GET /admin/dashboard - Display the list of companies
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const companies = await Company.findAll();
    // We'll create the 'admin-dashboard.ejs' file in the next step
    res.render('admin-dashboard', {
      title: 'Admin Dashboard',
      companies: companies,
    });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    res.status(500).send('Error fetching company data.');
  }
});

// POST /admin/approve/:id - Approve a company
router.post('/approve/:id', isAdmin, async (req, res) => {
  const companyId = req.params.id;
  try {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).send('Company not found.');
    }

    // 1. TODO: Call the smart contract to authorize the company
    // We will uncomment this in a later step when the helper is ready.
    // const txId = await authorizeCompanyOnChain(company.stacksWalletAddress);
    // console.log(`Transaction submitted to authorize ${company.companyName} with TXID: ${txId}`);

    // 2. Update the company's status in the database
    company.status = 'approved';
    await company.save();

    console.log(`Company "${company.companyName}" approved in the database.`);
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(`Failed to approve company ${companyId}:`, error);
    res.status(500).send('Error approving company.');
  }
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/admin/dashboard');
    }
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
  });
});


module.exports = router;
