require('dotenv').config();
module.exports = {
	// enabled logging for development
	logging: false,
	HANA_URL: process.env.HANA_URL,
	TWILIO_SID: process.env.TWILIO_SID,
	TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
	FROM_NUMBER: process.env.FROM_NUMBER
};