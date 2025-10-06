'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user');
const Plan = require('./plan');
module.exports = (sequelize, DataTypes) => {
  class plan_feature extends Model {
    static associate(models) {
    }
  }
  plan_feature.init({
    id:{
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true 
    },
    user_id:{
      type: DataTypes.BIGINT,
      references: {
        model: User,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    plan_id:{
      type: DataTypes.BIGINT,
      references: {
        model: Plan,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    feature_name:{
      type: DataTypes.STRING,
    },
    value_type:{
      type: DataTypes.STRING,
    },
    feature_value:{
      type: DataTypes.STRING,
    },
    status:{
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'plan_feature',
    tableName: 'plan_features',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid:false
  });
  return plan_feature;
};