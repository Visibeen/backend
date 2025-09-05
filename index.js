require('dotenv').config();
require('express-group-routes');
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const http = require("http");
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

app.use(
	cors({
		origin: function (origin, callback) {
			callback(null, true);
		},
	})
);

app.options("*", cors());
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({ createParentPath: true, limits: { fileSize: config.limit_file_size } }));

const middleware = require("./utils/middleware")
app.get('/health', (req, res) => {
	res.status(200).send('OK');
});
//Defined all urls here
app.group('/api', (router) => {
	router.use('/file', require("./api/_files"));
	router.use('/migrate', require("./api/migrate"));
	router.use('/version', require("./api/version"));
	router.use("/health", require("./api/health"));
	router.group('/v1', (groupV1) => {
		groupV1.use('/errors', require("./api/errors"));
		groupV1.group('/customer', (groupRouter) => {
			groupRouter.use('/auth', require('./api/customer/auth/index'));
			groupRouter.use([middleware.verifyAuthenticate, middleware.routeAuthentication([3, 1])]);
			groupRouter.use('/profile', require('./api/customer/profile/index'));
			groupRouter.use('/account', require('./api/customer/business_account/index'));
			groupRouter.use('/contact-us', require('./api/customer/contact_us/index'))
			groupRouter.use('/edms', require('./api/customer/edms/index'))
			groupRouter.use('/post', require('./api/customer/post/index'))
			groupRouter.use('/accounts', require('./api/customer/account/index'));
			groupRouter.use('/gst-information', require('./api/customer/gst_information/index'));
			groupRouter.use('/cro-information', require('./api/customer/cro_information/index'));
			groupRouter.use('/holiday', require('./api/customer/holiday/index'));
			groupRouter.use('/gmb-profile-socre', require('./api/customer/gmb_profile_socre/index'));
		});
	});
});

var httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(process.env.APP_PORT || 3000, function () {
	console.log('Web app hosted at port: ' + httpServer.address().port)
});