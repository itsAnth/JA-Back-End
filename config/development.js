require('dotenv').config();
module.exports = {
	// enabled logging for development
	logging: true,
	DB_URL: process.env.DB_URL,
	TWILIO_SID: process.env.TEST_TWILIO_SID,
	TWILIO_AUTH_TOKEN: process.env.TEST_TWILIO_AUTH_TOKEN,
	FROM_NUMBER: process.env.TEST_FROM_NUMBER
};