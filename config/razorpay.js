const Razorpay = require('razorpay');

let cachedInstance = null;

function getRazorpayInstance() {
	const keyId = process.env.RAZORPAY_KEY_ID;
	const keySecret = process.env.RAZORPAY_KEY_SECRET;
	if (!keyId || !keySecret) {
		throw new Error('Razorpay keys missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
	}
	if (!cachedInstance) {
		cachedInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
	}
	return cachedInstance;
}

module.exports = getRazorpayInstance;


