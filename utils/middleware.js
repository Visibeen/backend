const config = require("../config");
const cs = require("../utils/const");
const models = require('../models');
const REST = require("../utils/REST");
const support = require("../utils/support")

verifyAuthenticate = async (req, res, next) => {
    try {
        var isOK = await REST.verifyBarrier(req, config.USER_SECRET);
        if (isOK == false) {
            return REST.error(res, cs.erAuthenticationFailed.content, cs.erAuthenticationFailed.code);
        }
        var cUser = await REST.decodeBarrier(req, config.USER_SECRET);
        if (cUser == null && cUser.userid == null) {
            return REST.error(res, cs.erAuthenticationFailed.content, cs.erAuthenticationFailed.code);
        }
        const token = req.headers.authorization;
        let user = await models.User.findOne({ where: { id: cUser.userid } })
        if (user == null) {
            return REST.error(res, "Account invalid", 400);
        }

        const accessToken = await models.User.findOne({
            where: {
                token: token,
                id: user.id
            }
        })
        if (accessToken == null) {
            return REST.error(res, "Invalid token", 400);
        }
        req.body.current_user = user.dataValues;

        next();
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
};

const routeAuthentication = (roles) => async (req, res, next) => {
    const cUser = req.body.current_user;
    if (cUser) {
        let user = await models.User.findOne({ where: { id: cUser.id } })
        if (roles.indexOf(user.role_id) !== -1) {
            next();
        } else {
            res.status(403).send({ message: "Invalid Token!" });
        }
    } else {
        res.status(401).send({ message: "Unauthorized" });
    }
}
module.exports = {
    verifyAuthenticate,
    routeAuthentication
};