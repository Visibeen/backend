'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class contact_us extends Model {
    static associate(models) {
    }
  }
  contact_us.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    name:{
      type: DataTypes.STRING,
    },
    business_name:{
      type: DataTypes.STRING,
    },
    business_category:{
      type: DataTypes.STRING,
    },
    email:{
      type: DataTypes.STRING,
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    date_and_time:{
      type: DataTypes.DATE,
    },
    location:{
      type: DataTypes.STRING,
    },
    lat:{
      type: DataTypes.STRING,
    },
    long:{
      type: DataTypes.STRING,
    },
    message: {
      type: DataTypes.TEXT,
    },
    status:{
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, {
    sequelize,
    modelName: 'contact_us',
    tableName: 'contact_us',
    timestamps: true,
    paranoid:false,
    underscored: true,
    freezeTableName: true,
  });
  return contact_us;
};