'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class cro_information extends Model {
    static associate(models) {
    }
  }
  cro_information.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
    },
    cro_employee_name: {
      type: DataTypes.STRING,
    },
    seo_employee_name: {
      type: DataTypes.STRING,
    },
    cro_category: {
      type: DataTypes.STRING,
    },
    fa_account: {
      type: DataTypes.STRING,
    },
    seo_post_period: {
      type: DataTypes.STRING,
    },
    total_post: {
      type: DataTypes.STRING,
    },
    report_period: {
      type: DataTypes.STRING,
    },
    client_status: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    recory_email: {
      type: DataTypes.STRING,
    },
    recory_password: {
      type: DataTypes.STRING,
    },
    google_account: {
      type: DataTypes.STRING,
    },
    location: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {  
    sequelize,
    modelName: 'cro_information',
    tableName: 'cro_informations',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });
  return cro_information;
};