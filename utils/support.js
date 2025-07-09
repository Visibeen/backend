const { Op } = require("sequelize");
const config = require("../config");
const constants = require("../constants");
const models = require("../models");
const cache = require("./cache");
const moment = require("moment");
const { sendPushNotification } = require('../utils/helper')

/**
 * Generate random number
 * @param {*} length 
 * @returns 
 */
function generateRandomNumber(length = 7) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const randomNumber = Math.floor(min + Math.random() * (max - min + 1));
    return String(randomNumber);
}
module.exports = {
    generateRandomNumber
};
