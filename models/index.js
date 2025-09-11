const Sequelize = require('sequelize');
let { sequelize } = require('../config/db');
const db = {};

const User = require('./user.js')(sequelize, Sequelize.DataTypes);
const user_role = require('./user_role.js')(sequelize, Sequelize.DataTypes);
const business_account = require('./business_account.js')(sequelize, Sequelize.DataTypes);
const contact_us = require('./contact_us.js')(sequelize, Sequelize.DataTypes);
const edms = require('./edms.js')(sequelize, Sequelize.DataTypes);
const post = require('./post.js')(sequelize, Sequelize.DataTypes);
const account = require('./account.js')(sequelize, Sequelize.DataTypes);
const gst_information = require('./gst_information.js')(sequelize, Sequelize.DataTypes);
const cro_information = require('./cro_information.js')(sequelize, Sequelize.DataTypes);
const holiday = require('./holiday.js')(sequelize, Sequelize.DataTypes);
const gmb_profile_socre = require('./gmb_profile_socre.js')(sequelize, Sequelize.DataTypes);
const Payment = require('./payment.js')(sequelize, Sequelize.DataTypes);

// user and bussiness account relationship
business_account.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(business_account, { foreignKey: 'user_id', as: 'business_account',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND EDMS RELATIONSHIP (cascade deletes)
edms.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(edms, { foreignKey: 'user_id', as: 'edms', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND POST RELATIONSHIP
post.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(post, { foreignKey: 'user_id', as: 'post',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND ACCOUNT RELATIONSHIP
account.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(account, { foreignKey: 'user_id', as: 'account',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND GST INFORMATION RELATIONSHIP
gst_information.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(gst_information, { foreignKey: 'user_id', as: 'gst_information',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND CRO INFORMATION RELATIONSHIP
cro_information.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(cro_information, { foreignKey: 'user_id', as: 'cro_information',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND HOLIDAY RELATIONSHIP
holiday.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(holiday, { foreignKey: 'user_id', as: 'holiday',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND CREATED BY RELATIONSHIP
holiday.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(holiday, { foreignKey: 'created_by', as: 'createdHolidays',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND UPDATED BY RELATIONSHIP 
holiday.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(holiday, { foreignKey: 'updated_by', as: 'updatedHolidays',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND GMB PROFILE SCORE RELATIONSHIP
gmb_profile_socre.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails',onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(gmb_profile_socre, { foreignKey: 'user_id', as: 'gmb_profile_socre',onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND PAYMENT RELATIONSHIP
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

module.exports = db;
db.User = User;
db.user_role = user_role;
db.business_account = business_account;
db.contact_us = contact_us;
db.edms = edms;
db.post = post;
db.account = account;
db.gst_information = gst_information;
db.cro_information = cro_information;
db.holiday = holiday;
db.gmb_profile_socre = gmb_profile_socre;
db.Payment = Payment;


Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.resetAllTable = async () => {
  await db.User.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.edms.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.post.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.account.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.gst_information.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.cro_information.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.holiday.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.business_account.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.contact_us.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
  await db.user_role.destroy({ where: {}, force: true, truncate: { cascade: true, restartIdentity: true } });
};

module.exports = db;
