'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class plan extends Model {
    static associate(models) {
    }
  }
  plan.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
    },
    billing_cycle: {
      type: DataTypes.ENUM("monthly", "annually"),
    },
    currency: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'plan',
    tableName: 'plans',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    paranoid: false
  });
  return plan;
};