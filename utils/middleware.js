const config = require("../config");
const cs = require("../utils/const");
const models = require('../models');
const REST = require("../utils/REST");
const support = require("../utils/support")

verifyAuthenticate = async (req, res, next) => {
    try {
        console.log('[Middleware] verifyAuthenticate - Starting authentication');
        console.log('[Middleware] Authorization header:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'MISSING');
        console.log('[Middleware] Request path:', req.path);
        console.log('[Middleware] Request method:', req.method);
        
        var isOK = await REST.verifyBarrier(req, config.USER_SECRET);
        if (isOK == false) {
            console.log('[Middleware] verifyBarrier failed - token verification returned false');
            return REST.error(res, cs.erAuthenticationFailed.content, cs.erAuthenticationFailed.code);
        }
        
        var cUser = await REST.decodeBarrier(req, config.USER_SECRET);
        console.log('[Middleware] Decoded user:', cUser);
        
        if (cUser == null || cUser.userid == null) {
            console.log('[Middleware] cUser is null or userid is null');
            return REST.error(res, cs.erAuthenticationFailed.content, cs.erAuthenticationFailed.code);
        }
        
        const token = req.headers.authorization;
        console.log('[Middleware] Token from headers:', token ? 'Present' : 'Missing');
        
        let user = await models.User.findOne({ where: { id: cUser.userid } })
        console.log('[Middleware] User found:', user ? user.email : 'Not found');
        
        if (user == null) {
            console.log('[Middleware] User not found in database');
            return REST.error(res, "Account invalid", 400);
        }

        // Token already verified by JWT - no need to check database
        // The JWT signature verification is sufficient for authentication
        
        console.log('[Middleware] Authentication successful for:', user.email);
        req.body.current_user = user.dataValues;

        next();
    } catch (error) {
        console.error('[Middleware] Authentication error:', error.message);
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

// Middleware to check if user is admin or super admin
const isAdminOrSuperAdmin = async (req, res, next) => {
    try {
        const cUser = req.body.current_user;
        if (!cUser) {
            return REST.error(res, "Unauthorized", 401);
        }

        const user = await models.User.findOne({ where: { id: cUser.id } });
        if (!user) {
            return REST.error(res, "User not found", 404);
        }

        const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@visibeen.com';
        const ADMIN_ROLE_IDS = [1, 2, 4, 7, 12];

        // Check if user is super admin or has admin role
        if (user.email === SUPER_ADMIN_EMAIL || ADMIN_ROLE_IDS.includes(user.role_id)) {
            next();
        } else {
            return REST.error(res, "Only admins can access this resource", 403);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
};

module.exports = {
    verifyAuthenticate,
    routeAuthentication,
    isAdminOrSuperAdmin
};