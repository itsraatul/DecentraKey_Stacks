// server/models/License.js

const { DataTypes } = require('sequelize');
const sequelize = require('../database'); // We will create this file next
const Company = require('./Company');

const License = sequelize.define('License', {
  // A unique ID for each license record
  id: {
    type: DataTypes.INTEGER,

    autoIncrement: true,
    primaryKey: true,
  },
  // The unique ID of the voucher/SBT on the blockchain
  voucherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  // The customer's name
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The customer's email
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The customer's Stacks wallet address
  customerWalletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The name of the software being licensed
  softwareName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The duration of the license in days
  licenseDurationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // A unique, secure token for the one-time claim link
  claimToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  
  isClaimed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  redeemTxId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  redeemedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

// This creates a relationship: a License belongs to a Company.
Company.hasMany(License);
License.belongsTo(Company);

module.exports = License;
