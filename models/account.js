'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class account extends Model {
    static associate(models) {
    }
  }
  account.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
    },
    image: {
      type: DataTypes.TEXT,
    },
    business_name: {
      type: DataTypes.STRING,
    },
    industry_type: {
      type: DataTypes.STRING,
    },
    start_date: {
      type: DataTypes.DATE,
    },
    end_date: {
      type: DataTypes.DATE,
    },
    email: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    website: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'account',
    tableName: 'accounts',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true

  });
  return account;
};