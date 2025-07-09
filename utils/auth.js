const { TokenExpiredError } = require("jsonwebtoken");
var jwt = require("jsonwebtoken");

module.exports = ex = {};

ex.shortTermToken = function (data, secretKey) {
	var token = jwt.sign(data, secretKey, {
		expiresIn: "24h",
	});
	return token;
};

ex.longTermToken = function (data, secretKey, day = 365) {
	var token = jwt.sign(data, secretKey, {
		expiresIn: day * 24 * 60 * 60,
	});
	return token;
};

ex.verifyToken = async function (token, secretKey) {
	return await new Promise((resolve) => {
		jwt.verify(token, secretKey, function (err, decoded) {
			resolve(err == null);
		});
	});
};

ex.decodeToken = async function (token, secretKey) {
	return await new Promise((resolve) => {
		jwt.verify(token, secretKey, function (err, decoded) {
			resolve(err == null ? decoded : null);
		});
	});
};
