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
const config = require('./config');
const db = require('./config/db')
const axios = require('axios')
db;

global.support = require("./utils/support");
global.constants = require("./constants/index");
const { initSocket } = require('./socket');
const app = express();

const allowedOrigins = ['https://visibeen.com', 'https://www.visibeen.com','https://api.visibeen.com','https://directory.visibeen.com','http://localhost:8089', 'http://localhost:3000','http://localhost:3001'];
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.options("*", cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({ createParentPath: true, limits: { fileSize: config.limit_file_size } }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
		groupV1.use('/gmb', require("./api/routes/gmbRoutes"));
		groupV1.use('/post-scheduler', require("./api/routes/postSchedulerRoutes"));
		groupV1.use('/directory', require('./api/routes/directoryRoutes'));
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
			groupRouter.use('/users', require('./api/routes/userRoutes'))
		})
	});
});

var httpServer = http.createServer(app);
initSocket(httpServer);

// Initialize task scheduler for scheduled notifications
const { initializeTaskScheduler } = require('./utils/taskScheduler');

httpServer.listen(process.env.APP_PORT || 5000, function () {
	console.log('Web app hosted at port: ' + httpServer.address().port);
	
	// Start the task scheduler after server is running
	initializeTaskScheduler();
});
