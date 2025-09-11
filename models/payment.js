'use strict';
const { Model } = require('sequelize');
const User = require('./user');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
    }
  }
  Payment.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    payment_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    refund_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR'
    },
    receipt: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('created', 'attempted', 'captured', 'refunded', 'failed'),
      allowNull: false,
      defaultValue: 'created'
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    paranoid: false,
    underscored: true
  });
  
  return Payment;
};
