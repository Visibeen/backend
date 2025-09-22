'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user');
module.exports = (sequelize, DataTypes) => {
  class employee extends Model {
    static associate(models) {
    }
  }
  employee.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    report_to: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: "id"
      }
    },
    email: {
      type: DataTypes.STRING,
    },
    employee_code: {
      type: DataTypes.STRING,
    },
    first_name: {
      type: DataTypes.STRING,
    },
    last_name: {
      type: DataTypes.STRING,
    },
    department: {
      type: DataTypes.STRING,
    },
    official_email: {
      type: DataTypes.STRING,
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    alternate_phone_number: {
      type: DataTypes.STRING,
    },
    date_of_joining: {
      type: DataTypes.DATE,
    },
    employee_type: {
      type: DataTypes.STRING,
    },
    additional_tags: {
      type: DataTypes.STRING,
    },
    family_member_name: {
      type: DataTypes.STRING,
    },
    family_relation: {
      type: DataTypes.STRING,
    },
    family_contact: {
      type: DataTypes.STRING,
    },
    comment: {
      type: DataTypes.TEXT,
    },
    permanent_address_line1: {
      type: DataTypes.STRING,
    },
    permanent_address_line2: {
      type: DataTypes.STRING,
    },
    permanent_city: {
      type: DataTypes.STRING,
    },
    permanent_zip_code: {
      type: DataTypes.STRING,
    },
    permanent_state: {
      type: DataTypes.STRING,
    },
    permanent_country: {
      type: DataTypes.STRING,
    },
    current_address_line1: {
      type: DataTypes.STRING,
    },
    current_address_line2: {
      type: DataTypes.STRING,
    },
    current_city: {
      type: DataTypes.STRING,
    },
    current_zip_code: {
      type: DataTypes.STRING,
    },
    current_state: {
      type: DataTypes.STRING,
    },
    current_country: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  }, {
    sequelize,
    modelName: 'employee',
    tableName: 'employees',
    timestamps: true,
    paranoid: false,
    underscored: true,
    freezeTableName: true,
  });
  return employee;
};