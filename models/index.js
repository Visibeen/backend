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
const employee = require('./employee.js')(sequelize, Sequelize.DataTypes);
const lead = require('./lead.js')(sequelize, Sequelize.DataTypes);
const meeting = require('./meeting.js')(sequelize, Sequelize.DataTypes);

// user and bussiness account relationship
business_account.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(business_account, { foreignKey: 'user_id', as: 'business_account', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND EDMS RELATIONSHIP (cascade deletes)
edms.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(edms, { foreignKey: 'user_id', as: 'edms', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND POST RELATIONSHIP
post.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(post, { foreignKey: 'user_id', as: 'post', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND ACCOUNT RELATIONSHIP
account.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(account, { foreignKey: 'user_id', as: 'account', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND GST INFORMATION RELATIONSHIP
gst_information.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(gst_information, { foreignKey: 'user_id', as: 'gst_information', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND CRO INFORMATION RELATIONSHIP
cro_information.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(cro_information, { foreignKey: 'user_id', as: 'cro_information', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND HOLIDAY RELATIONSHIP
holiday.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(holiday, { foreignKey: 'user_id', as: 'holiday', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND CREATED BY RELATIONSHIP
holiday.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(holiday, { foreignKey: 'created_by', as: 'createdHolidays', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND UPDATED BY RELATIONSHIP 
holiday.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(holiday, { foreignKey: 'updated_by', as: 'updatedHolidays', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND GMB PROFILE SCORE RELATIONSHIP
gmb_profile_socre.belongsTo(User, { foreignKey: 'user_id', as: 'userdetails', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(gmb_profile_socre, { foreignKey: 'user_id', as: 'gmb_profile_socre', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// USER AND PAYMENT RELATIONSHIP (use unique alias to avoid collision)
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'paymentUser', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
// meeting and lead relationship
meeting.belongsTo(lead, { foreignKey: 'lead_id', as: 'leadDetails' })
lead.hasMany(meeting, { foreignKey: 'lead_id', as: "meetingDetails" })
// meeting and employee relationship
meeting.belongsTo(employee, { foreignKey: 'employee_id', as: 'employeeDetails' })
employee.hasMany(meeting, { foreignKey: 'employee_id', as: "meetingDetails" })
// meeting and client relationship
meeting.belongsTo(User, { foreignKey: 'client_id', as: 'clientDetails' })
User.hasMany(meeting, { foreignKey: 'client_id', as: "meetingDetail" })
// meeting and user relationship
meeting.belongsTo(User, { foreignKey: 'user_id', as: 'userDetails' })
User.hasMany(meeting, { foreignKey: 'user_id', as: "meetingDetails" })
// meeting and createdby relationship
meeting.belongsTo(User, { foreignKey: 'created_by', as: 'createdby' })
User.hasMany(meeting, { foreignKey: 'created_by', as: "meeting" })
// meeting and updatedby relationship
meeting.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' })
User.hasMany(meeting, { foreignKey: 'updated_by', as: "meetings" })
// employee and user relationship
employee.belongsTo(User, { foreignKey: 'user_id', as: 'userDetails' })
User.hasMany(employee, { foreignKey: 'user_id', as: "employeeDetails" })
// leeds and user relatioinship
lead.belongsTo(User, { foreignKey: 'user_id', as: 'userDetails' })
User.hasMany(lead, { foreignKey: 'user_id', as: "leedDetails" })
// leads and employee relationship
lead.belongsTo(employee, { foreignKey: "employee_id", as: "employeeDetails" })
employee.hasMany(lead, { foreignKey: "employee_id", as: "leadDetails" })
// employee and user role relationship
employee.belongsTo(user_role, { foreignKey: "role_id", as: "role" })
user_role.hasMany(employee, { foreignKey: "role_id", as: "employeeDetails" })

employee.belongsTo(User, { foreignKey: "report_to", as: "reportby" })
User.hasMany(employee, { foreignKey: "report_to", as: "employeeDetail" })

User.belongsTo(user_role, { foreignKey: "role_id", as: "roles" })
user_role.hasMany(User, { foreignKey: "role_id", as: "userDetails" })

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
db.employee = employee;
db.lead = lead;
db.meeting = meeting


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
