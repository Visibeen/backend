const Sequelize = require('sequelize');
let { sequelize } = require('../config/db');
const db = {};

const User = require('./user.js')(sequelize, Sequelize.DataTypes);
const user_role = require('./user_role.js')(sequelize, Sequelize.DataTypes);
const business_account = require('./business_acount.js')(sequelize, Sequelize.DataTypes);

//  user and user_ firm relationship
// User_firm.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// User.hasMany(User_firm, { foreignKey: 'user_id', as: 'user_firm' });

module.exports = db;
db.User = User;
db.user_role = user_role;
db.business_account = business_account


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
