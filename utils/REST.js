var auth = require("./auth");

module.exports = ex = {};

ex.verifyBarrier = async function (req, secretKey) {
	if (!req.headers.authorization) return false;
	return await auth.verifyToken(req.headers.authorization, secretKey);
};

ex.decodeBarrier = async function (req, secretKey) {
	if (req.headers.authorization)
		return await auth.decodeToken(req.headers.authorization, secretKey);
	return null;
};

ex.response = function (res, result) {
	if (result != null && result != undefined && result != "")
		result = JSON.parse(JSON.stringify(result));

	res.status(200);
	res.json(result);
};

ex.error = function (res, errContent, errCode) {
	res.status(errCode);
	res.json({ error: errContent, code: errCode });
};

ex.success = function (res, data, message = null, code = 200) {
	if (data != null && data != undefined && data != "")
		data = JSON.parse(JSON.stringify(data));
	res.json({ error: null, code: code, data: data, message: message });
};
