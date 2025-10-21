var config = require("../config");
const Sequelize = require('sequelize');

let sequelize = new Sequelize(config.database_server.database, config.database_server.user, config.database_server.password, {
  host: config.database_server.host,
  port: config.database_server.port,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  freezeTableName: true,
  pool: {
    max: 20,              // Maximum 20 connections (reasonable for production)
    min: 5,               // Keep 5 warm connections ready
    acquire: 60000,       // 60 seconds timeout for acquiring connection (increased)
    idle: 10000,          // Release idle connections after 10 seconds
    evict: 1000,          // Check for idle connections every 1 second
    handleDisconnects: true
  },
  retry: {
    max: 3,               // Retry failed connections 3 times
    timeout: 5000         // Wait 5 seconds between retries (increased)
  },
  dialectOptions: {
    connectTimeout: 60000 // 60 seconds connection timeout (increased for remote DB)
  }
});

// Don't authenticate immediately - let it connect lazily
// This prevents startup failures if DB is temporarily unavailable
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch(err => {
    console.error('⚠️  Database connection failed (will retry on first query):', err.message);
    // Don't exit - let the app start and retry on first query
  });

module.exports = {
  sequelize
};

