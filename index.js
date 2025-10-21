require('dotenv').config();
require('express-group-routes');
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const http = require("http");
const fs = require('fs');
const path = require('path');
const https = require('https');
const fileUpload = require('express-fileupload');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const timeout = require('connect-timeout');
const compression = require('compression');
const helmet = require('helmet');
const config = require('./config');
const db = require('./config/db')
const axios = require('axios')
db;

global.support = require("./utils/support");
global.constants = require("./constants/index");
const { initSocket } = require('./socket');
const app = express();

const allowedOrigins = ['https://visibeen.com', 'https://www.visibeen.com','https://api.visibeen.com','http://localhost:8089', 'http://localhost:3000','http://localhost:3001'];

// Security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now (configure based on your needs)
    crossOriginEmbedderPolicy: false
}));

// Enable gzip compression for all responses
app.use(compression());

// Request timeout - prevent long-running requests from blocking server
app.use(timeout('30s'));

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.options("*", cors({ origin: allowedOrigins, credentials: true }));

// Rate limiting to prevent DDoS attacks
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per windowMs (increased for development)
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply rate limiting to all API routes (only in production)
if (process.env.NODE_ENV === 'production') {
    app.use('/api/', apiLimiter);
    
    // Stricter rate limiting for authentication routes
    app.use('/api/v1/customer/auth/login', authLimiter);
    app.use('/api/v1/admin/auth/login', authLimiter);
} else {
    console.log('⚠️  Rate limiting disabled in development mode');
}

app.use(express.json({ limit: '10mb' })) // Limit JSON payload size
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({ createParentPath: true, limits: { fileSize: config.limit_file_size } }));

// Timeout handler - must be after all routes
app.use((req, res, next) => {
    if (!req.timedout) next();
});

const middleware = require("./utils/middleware")
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
//Defined all urls here
app.group('/api', (router) => {
	router.use('/file', require("./api/_files"));
	router.use('/migrate', require("./api/migrate"));
	router.use('/version', require("./api/version"));
	router.use('/whatsapp', require("./api/whatsapp"));
	router.use("/health", require("./api/health"));
	router.group('/v1', (groupV1) => {
		groupV1.use('/errors', require("./api/errors"));
		groupV1.group('/customer', (groupRouter) => {
			groupRouter.use('/auth', require('./api/customer/auth/index'));
			groupRouter.use([middleware.verifyAuthenticate, middleware.routeAuthentication([3])]);
			groupRouter.use('/profile', require('./api/customer/profile/index'));
			groupRouter.use('/account', require('./api/customer/business_account/index'));
			groupRouter.use('/contact-us', require('./api/customer/contact_us/index'))
			groupRouter.use('/edms', require('./api/customer/edms/index'))
			groupRouter.use('/post', require('./api/customer/post/index'))
			groupRouter.use('/accounts', require('./api/customer/account/index'));
			groupRouter.use('/gst-information', require('./api/customer/gst_information/index'));
			groupRouter.use('/cro-information', require('./api/customer/cro_information/index'));
			groupRouter.use('/gmb-profile-socre', require('./api/customer/gmb_profile_socre/index'));
			groupRouter.use('/payment', require('./api/customer/payment/index'));
			groupRouter.use('/plan-feature', require('./api/customer/plan_feature/index'));
			groupRouter.use('/post-scheduler', require('./api/customer/post_scheduler/index'));
			groupRouter.use('/task', require('./api/customer/task/index'));
		});
		groupV1.group('/admin', (groupRouter) => {
			groupRouter.use('/role', require('./api/admin/user_role/index'))
			groupRouter.use('/auth', require('./api/admin/User/index'));
			// Permissions routes need to be accessible to all authenticated users for check-access
			groupRouter.use('/permissions', [middleware.verifyAuthenticate], require('./api/admin/permissions/index'))
			groupRouter.use('/gmb-account', [middleware.verifyAuthenticate], require('./api/admin/gmb_account/index'))
			groupRouter.use([middleware.verifyAuthenticate, middleware.routeAuthentication([1])]);
			groupRouter.use('/employee', require('./api/admin/employee/index'));
			groupRouter.use('/leads', require('./api/admin/lead/index'))
			groupRouter.use('/meeting', require('./api/admin/meeting/index'))
			groupRouter.use('/attendence', require('./api/admin/attendence/index'))
			groupRouter.use('/routes', require('./api/admin/admin_routes/index'))
			groupRouter.use('/holiday', require('./api/admin/holiday/index'))
			groupRouter.use('/plan', require('./api/admin/plan/index'))
			groupRouter.use('/plan-feature', require('./api/admin/plan_feature/index'))
			groupRouter.use('/task', require('./api/admin/task/index'))
		})
	});
});

var httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(process.env.APP_PORT || 5000, function () {
	console.log('Web app hosted at port: ' + httpServer.address().port)
});
