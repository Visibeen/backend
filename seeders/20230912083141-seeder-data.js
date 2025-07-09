"use strict";
const { gen } = require("../utils/hash");
const { getDefaultPermissions } = require("../utils/support");
const { Op } = require("sequelize");
const cache = require('../utils/cache');
const constants = require("../constants/index");
const firebaseService = require("../service/firebaseService");
const models = require("../models");
const support = require("../utils/support");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let role = await models.Role.findOne({
      where: { name: constants.ROLE.ROLE_NAME_DEFAULT },
    });
    if (role == null) {
      let dataRole = {
        name: constants.ROLE.ROLE_NAME_DEFAULT,
        permissions: JSON.stringify(getDefaultPermissions()),
      };
      role = await models.Role.create(dataRole);
      support.addLog(null, null, "role", role.id, constants.LOG.CREATE_ROLE, "Create role success", dataRole, null);
    }

    let admin = await models.Admin.findOne({
      where: { email: constants.ADMIN.ADMIN_EMAIL_DEFAULT },
    });
    if (admin == null) {
      let fireBaseUser = null;
      const resultRetrieveUser = await firebaseService.getUserByEmail(
        constants.ADMIN.ADMIN_EMAIL_DEFAULT
      );
      if (resultRetrieveUser.success && resultRetrieveUser.data) {
        fireBaseUser = resultRetrieveUser.data;
      }
      if (fireBaseUser == null) {
        const resultCreateUser = await firebaseService.createUser({
          email: constants.ADMIN.ADMIN_EMAIL_DEFAULT,
          emailVerified: false,
          password: constants.ADMIN.ADMIN_PASSWORD_DEFAULT,
          displayName: "Super Admin",
          disabled: false,
        });
        if (resultCreateUser.success && resultCreateUser.data) {
          fireBaseUser = resultCreateUser.data;
        }
      }
      if (fireBaseUser) {
        const dataAdmin = {
          uid: fireBaseUser.uid,
          role_id: role.id,
          name: fireBaseUser.displayName,
          email: constants.ADMIN.ADMIN_EMAIL_DEFAULT,
          password_show: constants.ADMIN.ADMIN_PASSWORD_DEFAULT,
        };
        const dataLog = JSON.parse(JSON.stringify(dataAdmin));
        dataAdmin.password = await gen(dataAdmin.password_show);
        admin = await models.Admin.create(dataAdmin);
        support.addLog(null, null, "admin", admin.id, constants.LOG.CREATE_ADMIN, "Create admin success", dataLog, null);
      }
    }

    const defaultSettings = [
      {
        key: constants.SETTING.KEY_MAXIMUM_NUMBER_OF_DAYS_AUTHORIZATION,
        name: "Maximum number of days the authorization is kept on the customer card.",
        type: "number",
        value: constants.SETTING.DEFAULT_MAXIMUM_NUMBER_OF_DAYS_AUTHORIZATION,
        description:
          "Maximum number of days the authorization is kept on the customer card.",
        order: 0,
        show_able: 1,
      },
      {
        key: constants.SETTING.KEY_SECURITY_DEPOSIT_BOOKING,
        name: "The amount authorized in the customer's card.",
        type: "number",
        value: constants.SETTING.DEFAULT_SECURITY_DEPOSIT_BOOKING,
        description:
          "This is the amount that will be authorized in the customer card when the customer rents a car, it will be retained until the authorization expires (According to the number of days you configure). After expiration, this amount will be released.",
        order: 0,
        show_able: 1,
      },
      {
        key: constants.SETTING.KEY_ALLOW_DUPLICATE_BOOKING,
        name: "Allow for duplicate car rental.",
        type: "text",
        value: constants.SETTING.DEFAULT_ALLOW_DUPLICATE_BOOKING,
        description:
          "This allow for duplicate car rental (Use in the test environment).",
        order: 1,
      },
      {
        key: constants.SETTING.KEY_MINIMUM_MINUTES_OF_CANCEL_NOT_INCUR_PENALTY,
        name: "Minimum number of minutes of cancel will not incur a penalty",
        type: "boolean",
        value: constants.SETTING.DEFAULT_MINIMUM_MINUTES_OF_CANCEL_NOT_INCUR_PENALTY,
        description:
          "This is the minimum number of minutes for cancel a booking without penalty. (For example, if the value is 10, the customer who cancels within 10 minutes of booking will not be penalized, otherwise there will be a penalty).",
        order: 0,
        show_able: 1,
      },
      {
        key: constants.SETTING.KEY_PENALTY_AMOUNT_CANCEL_BOOKING,
        name: "Penalty amount when cancel booking or not picking up the vehicle (minimum is $5, or 0).",
        type: "number",
        value: constants.SETTING.DEFAULT_PENALTY_AMOUNT_CANCEL_BOOKING,
        description:
          "This is the amount fined by the customer when the reservation is canceled or the customer does not come to pick up the vehicle",
        order: 0,
        show_able: 1,
      },
      {
        key: constants.SETTING.KEY_TYPE_OF_USER_LICENSE_CONFIRMATION,
        name: "Type of confirmation of the user account.",
        type: "text",
        value: constants.SETTING.DEFAULT_TYPE_OF_USER_LICENSE_CONFIRMATION,
        description:
          "Type of confirmation of the user account.",
        order: 0,
        show_able: 1,
      },
      {
        key: constants.SETTING.KEY_NUMBER_MINUTES_AFTER_END_TRIP_WILL_BE_CHARGE_IF_NO_NEW_TRIP,
        name: "The number of minutes after the end of the trip will be charged if there are no new trips ",
        type: "text",
        value: constants.SETTING.DEFAULT_NUMBER_MINUTES_AFTER_END_TRIP_WILL_BE_CHARGE_IF_NO_NEW_TRIP,
        description:
          "The number of minutes after the end of the trip will be charged if there are no new trips ",
        order: 0,
        show_able: 1,
      }
    ];
    for (const defaultSetting of defaultSettings) {
      await models.Setting.findOrCreate({
        where: { key: defaultSetting.key },
        defaults: defaultSetting,
      });
    }
    cache.clearCache(constants.SETTING.KEY_SETTINGS_LIST);

    const defaultDurations = [
      {
        value: 2,
        type: constants.DURATION.TYPES.HOUR,
        order: 0
      },
      {
        value: 4,
        type: constants.DURATION.TYPES.HOUR,
        order: 1
      },
      {
        value: 8,
        type: constants.DURATION.TYPES.HOUR,
        order: 2
      },
      {
        value: 16,
        type: constants.DURATION.TYPES.HOUR,
        order: 3
      },
      {
        value: 1,
        type: constants.DURATION.TYPES.DAY,
        order: 4
      },
      {
        value: 2,
        type: constants.DURATION.TYPES.DAY,
        order: 5
      },
      {
        value: 4,
        type: constants.DURATION.TYPES.DAY,
        order: 6
      },
      {
        value: 1,
        type: constants.DURATION.TYPES.WEEK,
        order: 7
      },
      {
        value: 2,
        type: constants.DURATION.TYPES.WEEK,
        order: 8
      }
    ];
    for (const defaultDuration of defaultDurations) {
      await models.Duration.findOrCreate({
        where: { value: defaultDuration.value, type: defaultDuration.type },
        defaults: defaultDuration,
      });
    };
    const defaultDurationBooking = await models.Duration.findOne({
      where: {
        deletedAt: { [Op.is]: null }
      },
      order: [['id', 'ASC']]
    });
    if (defaultDurationBooking != null) {
      await models.Booking.update({ duration_id: defaultDurationBooking.id }, { where: { duration_id: { [Op.is]: null } } });
    }
  },
  async down(queryInterface, Sequelize) {
    await models.resetAllTable();
  },
};
