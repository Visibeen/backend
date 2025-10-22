var config = require("../config");
const Sequelize = require('sequelize');

let sequelize = new Sequelize(config.database_server.database, config.database_server.user, config.database_server.password, {
  host: config.database_server.host,
  port: config.database_server.port,
  dialect: 'mysql',
  logging: false,
  freezeTableName: true,
  pool: {
    max: 100,
    min: 0,
    acquire: 1200000,
    acquire: 1000000,
  }
});

sequelize.authenticate().then(() => {
  console.log('Connect DB success.');
}).catch(err => {
  console.error('Connect DB failed:', err);
});

module.exports = {
  sequelize
};

