module.exports = ex = {};

ex.data = function (data, error) {
	var obj = {};
	if (error && error.content) obj.error = error.content;
	else if (error) obj.error = error;
	else obj.error = null;

	if (!error) {
		obj.code = this.Succeed.code;
	} else if (error && error.code != undefined) {
		obj.code = error.code;
	}

	obj.data = data;
	if (!obj.data) obj.data = null;
	return obj;
};

ex.error = function (error, content, error_inside) {
	var obj = this.data(content, error);
	if (error_inside) obj.error_inside = error_inside;
	return obj;
};

ex.erCannotConnectDatabase = {
	code: 701,
	content: "Cannot Connect To Database",
};

ex.Succeed = { code: 200, content: "Succeed" };

ex.erExpertExisted = { code: 302, content: "Expert Existed" };

ex.erCannotQueryToDatabase = { code: 702, content: "Cannot Query To Database" };
ex.erCannotCreateObject = { code: 703, content: "Cannot Create Object" };
ex.erInvalidRequest = { code: 704, content: "Invalid Request" };
ex.erAuthenticationFailed = {
	code: 400,
	content: "Authentication Failed",
};
ex.erObjectExisted = { code: 706, content: "Object Failed" };
ex.erObjectNotExisted = { code: 707, content: "Object Not Existed" };
ex.erObjectIsLocked = { code: 708, content: "Object is locked" };
ex.erPermissionDenied = { code: 709, content: "Permission Denied" };
ex.erUploadFailed = { code: 711, content: "Upload Failed" };
ex.erInvalidOTP = { code: 712, content: "Invalid OTP" };
ex.erCannotModifyObject = { code: 713, content: "Cannot Modify Object" };
ex.erCannotCreateLog = { code: 714, content: "Cannot Create Log" };
ex.erfbTokenInvalid = { code: 403, content: "Firebase token invalid" };
ex.erUploadMedia = { code: 400, content: "Upload media failed" };

ex.erUsernameLength = {
	code: 720,
	content: "Username too long, maximum is 30 chars",
};
ex.erUsernameSpace = { code: 721, content: "Username cannot contain space" };
ex.erSpeicalCharacter = {
	code: 721,
	content: "Username cannot contain special character",
};
ex.erUsernameExisted = { code: 721, content: "Email registered" };
ex.erWalletExisted = { code: 743, content: "Wallet Existed" };

ex.erUsernotExisted = { code: 722, content: "User is not existed" };
ex.erClubnotExisted = { code: 723, content: "Club is not existed" };
ex.erSubscriptionUsed = { code: 766, content: "Subscription is used! " };
ex.erUserIsNotJoined = { code: 767, content: "User is not joined club! " };
ex.erCannotUpdate = { code: 767, content: "Cannot update information! " };
