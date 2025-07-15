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

const middleware = require("./utils/middleware");
app.get('/health', (req, res) => {
	res.status(200).send('OK');
});
//Defined all urls here
app.group('/api', (router) => {
	router.use('/file', require("./api/_files"));
	router.use('/migrate', require("./api/migrate"));
	router.use('/version', require("./api/version"));
	router.use("/health", require("./api/health"));
	router.use("/cron", require("./api/cron_jobs"));
	router.group('/v1', (groupV1) => {
		groupV1.use('/errors', require("./api/errors"));
		groupV1.group('/customer', (groupRouter) => {
			groupRouter.use('/auth', require('./api/customer/auth/index'));
			groupRouter.use([middleware.verifyAuthenticate, middleware.routeAuthentication([3])]);
			groupRouter.use('/profile', require('./api/customer/profile/index'));
		});
		groupV1.group('/portal', (groupRouter) => {
			//groupRouter.use('/configureSetting', require('./api/portal/configure_setting/index'))
			//groupRouter.use("/users", require("./api/portal/users/index"));
			//groupRouter.use([middleware.verifyAuthenticate, middleware.routeAuthentication([1, 2])]);
			

		});
		groupV1.group('/admin_portal', (groupRouter) => {
			//groupRouter.use('/auth', require('./api/admin_portal/user_auth/index'));
			//groupRouter.use('/role', require('./api/admin_portal/user_role/index'))
			//groupRouter.use([middleware.verifyAuthenticate, middleware.routeAuthentication([3, 4])]);
			//groupRouter.use('/admins', require('./api/admin_portal/admin/index'));
		})
	});
});

let BASE_URL;
if (process.env.NODE_ENV === 'development') {
	BASE_URL = process.env.BASE_URL_DEV;
} else if (process.env.NODE_ENV === 'staging') {
	BASE_URL = process.env.BASE_URL_STAGE;
} else if (process.env.NODE_ENV === 'production') {
	BASE_URL = process.env.BASE_URL_PROD;
} else {
	throw new Error("Invalid NODE_ENV value");
}
// Schedule a task to run every day at 12:00 AM
// cron.schedule('0 0 * * *', async () => {
// 	console.log('Running a task every day at 12:00 AM');
// 	try {
// 		const response = await axios.get(`${BASE_URL}/api/cron/terminateQuotation`);
// 		if (response.status === 200) {
// 			console.log('Cron job run successfully!', response.data);
// 		} else {
// 			console.warn(`Cron job completed with status: ${response.status}`);
// 		}
// 	} catch (error) {
// 		console.error('Cron job failed to run!', error.message);
// 	}
// });

var httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(process.env.APP_PORT || 3000, function () {
	console.log('Web app hosted at port: ' + httpServer.address().port)
});
