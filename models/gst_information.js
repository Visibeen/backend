'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class gst_information extends Model {
    static associate(models) {
    }
  }
  gst_information.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
    },
    gst_details: {
      type: DataTypes.STRING,
    },
    start_date: {
      type: DataTypes.STRING
    },
    end_date: {
      type: DataTypes.STRING
    },
    payment_details: {
      type: DataTypes.STRING,
    },
    bank_name: {
      type: DataTypes.STRING,
    },
    cheque_number: {
      type: DataTypes.STRING,
    },
    payment_with_gst: {
      type: DataTypes.STRING,
    },
    net_payment: {
      type: DataTypes.STRING,
    },
    gst: {
      type: DataTypes.STRING,
    },
    advance: {
      type: DataTypes.STRING,
    },
    pending: {
      type: DataTypes.STRING,
    },
    top_up_amount: {
      type: DataTypes.STRING,
    },
    net_sale: {
      type: DataTypes.STRING,
    },
    emi_date: {
      type: DataTypes.DATE,
    },
    emi_payment_per_month: {
      type: DataTypes.STRING,
    },
    esc_amount_number: {
      type: DataTypes.STRING,
    },
    esc_bank_name: {
      type: DataTypes.STRING,
    },
    esc_ifsc_code: {
      type: DataTypes.STRING,
    },
    umrn_number: {
      type: DataTypes.STRING,
    },
    contact_person: {
      type: DataTypes.STRING,
    },
    contact_number: {
      type: DataTypes.STRING,
    },
    alternative_contact_number: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'gst_information',
    tableName: 'gst_informations',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });
  return gst_information;
};