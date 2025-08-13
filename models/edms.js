'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class edms extends Model {
    static associate(models) {
    }
  }
  edms.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    user_id:{
      type: DataTypes.BIGINT
    },
    name:{
      type: DataTypes.STRING
    },
    business_name:{
      type: DataTypes.STRING
    },
    address:{
      type: DataTypes.STRING
    },
    email:{
      type: DataTypes.STRING
    },
    contact_number:{
      type: DataTypes.STRING
    },
    alternative_contact_number:{
      type: DataTypes.STRING
    },
    website:{
      type: DataTypes.TEXT
    },
    status:{
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    image:{
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'edms',
    tableName: 'edms',
    underscored: true,
    timestamps: true,
    paranoid:false,
    freezeTableName:true
  });
  return edms;
};