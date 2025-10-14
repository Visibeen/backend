'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class allowed_email extends Model {
    static associate(models) {
      // Association with User model for added_by - defined in models/index.js
      // allowed_email.belongsTo(models.User, {
      //   foreignKey: 'added_by',
      //   as: 'addedByAdmin'
      // });
    }
  }
  
  allowed_email.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    added_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }, {
    sequelize,
    modelName: 'allowed_email',
    tableName: 'allowed_emails',
    freezeTableName: true,
    paranoid: false,
    underscored: true,
    timestamps: true
  });
  
  return allowed_email;
};
