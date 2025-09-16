'use strict';
const { Model } = require('sequelize');
const User = require('./user')
const Employee = require('./employee')
const lead = require('./lead')
module.exports = (sequelize, DataTypes) => {
  class Meeting extends Model {
    static associate(models) {
    }
  }
  Meeting.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
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
    lead_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: lead,
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
    client_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    comment: {
      type: DataTypes.STRING,
    },
    title: {
      type: DataTypes.STRING,
    },
    tags: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.STRING,
    },
    gst_number: {
      type: DataTypes.STRING,
    },
    meeting_with: {
      type: DataTypes.STRING,
    },
    lat: {
      type: DataTypes.STRING,
    },
    long: {
      type: DataTypes.STRING,
    },
    presentation_show: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    gmb_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    telly_meeting: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    meeting_date: {
      type: DataTypes.DATE,
    },
    date_time: {
      type: DataTypes.DATE,
    },
    month: {
      type: DataTypes.STRING,
    },
    year: {
      type: DataTypes.STRING,
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
    modelName: 'meeting',
    tableName: 'meetings',
    underscored: true,
    timestamps: true,
    freezeTableName: true,
    paranoid: false
  });

  return Meeting;
};
