const Sequelize = require('sequelize');
let { sequelize } = require('../config/db');
const db = {};

const User = require('./user.js')(sequelize, Sequelize.DataTypes);
const user_role = require('./user_role.js')(sequelize, Sequelize.DataTypes);
const business_account = require('./business_account.js')(sequelize, Sequelize.DataTypes);
const contact_us = require('./contact_us.js')(sequelize, Sequelize.DataTypes);
const edms = require('./edms.js')(sequelize, Sequelize.DataTypes);

// user and bussiness account relationship
business_account.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails' })
User.hasMany(business_account, { foreignKey: 'user_id', as: 'business_account' });
// USER AND EDMS RELATIONSHIP
edms.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails' })
User.hasMany(edms, { foreignKey: 'user_id', as: 'edms' });

module.exports = db;
db.User = User;
db.user_role = user_role;
db.business_account = business_account;
db.contact_us = contact_us;
db.edms = edms;


Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.resetAllTable = async () => {
  await db.User.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
};

module.exports = db;
