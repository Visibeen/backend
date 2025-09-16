'use strict';
const { Model } = require('sequelize');
const User = require('./user')
const Employee = require('./employee')
module.exports = (sequelize, DataTypes) => {
  class Lead extends Model {
    static associate(models) {
    }
  }

  Lead.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    employee_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Employee,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    is_tele: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    business_name: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      validate: { isEmail: true },
    },
    website: {
      type: DataTypes.TEXT,
    },
    first_name: {
      type: DataTypes.STRING,
    },
    last_name: {
      type: DataTypes.STRING,
    },
    contact_email: {
      type: DataTypes.STRING,
      validate: { isEmail: true },
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    alt_number: {
      type: DataTypes.STRING,
    },
    tags: {
      type: DataTypes.TEXT,
    },
    type: {
      type: DataTypes.STRING,
    },
    address_line1: {
      type: DataTypes.STRING,
    },
    address_line2: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    zip_code: {
      type: DataTypes.STRING,
    },
    country: {
      type: DataTypes.STRING,
    },
    comment: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_website_service: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_gmb_services: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_smo_services: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_other_services: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.DATE,
    },
    updated_by: {
      type: DataTypes.BIGINT,
      references: {
        model: User,
        key: 'id',
      },
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'lead',
    tableName: 'leads',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });

  return Lead;
};
