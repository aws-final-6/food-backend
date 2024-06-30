const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function connectMySQL() {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log("Connected to MySQL database");
}

module.exports = { connectMySQL, pool };
