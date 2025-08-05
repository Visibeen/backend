'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user')
module.exports = (sequelize, DataTypes) => {
  class business_account extends Model {
    static associate(models) {
      // BusinessAccount belongs to User
      business_account.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      });
    }
  }
  business_account.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
  user_id: {
  type: DataTypes.BIGINT,
  allowNull: false,
  references: {
    model: 'User',
    key: 'id'
  },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE'
},

    business_name: {
      type: DataTypes.STRING,
    },
    business_category: {
      type: DataTypes.STRING,
    },
    is_location: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lat: {
      type: DataTypes.STRING,
    },
    long: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
    },
    street_address: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    pin_code: {
      type: DataTypes.INTEGER,
    },
    is_business: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    contact_number: {
      type: DataTypes.STRING,
    },
    select_area: {
      type: DataTypes.STRING,
    },
    place_pin: {
      type: DataTypes.STRING,
    },
    is_deliveries: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    chat: {
      type: DataTypes.STRING,
    },
    website: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, {
    sequelize,
    modelName: 'business_account',
    tableName: 'business_accounts',
    underscored: true,
    timestamps:true,
    paranoid:false,
    freezeTableName:true
  });

  return business_account;
};
