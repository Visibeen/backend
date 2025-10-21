require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing database connection...\n');
  console.log('Host:', process.env.MYSQL_HOST);
  console.log('Port:', process.env.MYSQL_PORT || 3306);
  console.log('Database:', process.env.MYSQL_DATABASE);
  console.log('User:', process.env.MYSQL_USER);
  console.log('');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 10000
    });

    console.log('✅ Database connection successful!');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('1. MySQL server is not running');
    console.error('2. Wrong credentials in .env file');
    console.error('3. Database does not exist');
    console.error('4. Firewall blocking connection');
    process.exit(1);
  }
}

testConnection();
