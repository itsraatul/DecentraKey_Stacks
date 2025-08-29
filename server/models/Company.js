const { DataTypes } = require('sequelize');
const sequelize = require('../database'); 

const Company = sequelize.define('Company', {
  // A unique ID for each company
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  // The company's registered name
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The company's contact email
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, 
  },
  // The company's hashed password for login
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The company's Stacks wallet address for issuing licenses
  stacksWalletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, 
  },
  // The approval status, controlled by the admin
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending', 
    allowNull: false,
  },
});

module.exports = Company;
