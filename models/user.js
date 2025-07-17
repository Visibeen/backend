'use strict';
const { Model } = require('sequelize');
const dbHelper = require("../utils/dbHelper");
const constants = require("../constants/user")
const User = require('./user')
const crypto = require('crypto');
module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    static associate(models) {
    }
    generateResetPasswordToken() {
      const token = crypto.randomBytes(20).toString('hex');
      return token;
    }
  }
  users.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    role_id: {
      type: DataTypes.BIGINT
    },
    user_uid: {
      type: DataTypes.STRING
    },
    full_name: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    password: {
      type: DataTypes.STRING
    },
    phone_number: {
      type: DataTypes.STRING
    },
    token: {
      type: DataTypes.TEXT
    },
    status: {
      allowNull: false,
      type: DataTypes.STRING,
      defaultValue: constants.STATUSES.PENDING
    },
    account_type:{
      type: DataTypes.STRING,
    },
    login_date: {
      type: DataTypes.DATE
    },
    logout_date: {
      type: DataTypes.DATE
    },
     reset_password_token: {
      type: DataTypes.STRING
    },
    reset_password_expires: {
      type: DataTypes.BIGINT
    },
 }, {
    sequelize,
    freezeTableName: true,
    modelName: 'users',
    tableName: 'users',
    timestamps: true,
    paranoid: false,
    underscored: true
  });
  return users;
};
