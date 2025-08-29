// server/database.js

const { Sequelize } = require('sequelize');
require('dotenv').config(); // Import dotenv to read .env file

// Create a new Sequelize instance to connect to your database.
// It reads the connection details from your environment variables.
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql', // Specify that we are using MySQL
  }
);

module.exports = sequelize;