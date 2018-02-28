var router = require('express').Router();
var path    = require("path");
var logger = require('../util/logger');

router.use('/sms', require('./sms/smsRoutes'));
router.use('/validate', require('./validate/validateRoutes'));

router.route('/online').get(function(req, res) {
	var oRes = {
		success: true,
		status: "online"
	};
	var sResponse = JSON.stringify(oRes);
	res.type('json');
	res.status(200).send(sResponse);
});
router.route('/').get(function(req, res) {
	res.sendFile(path.join(__dirname+'/../html/routes.html'));
});
router.route('/database').get(function(req, res) {
	res.sendFile(path.join(__dirname+'/../html/database.html'));
});
router.route('/terms').get(function(req, res) {
	res.sendFile(path.join(__dirname+'/../html/termsfeed-terms-conditions-html-english.html'));
});
router.route('/favicon.ico').get(function(req, res) {
    res.status(204);
});

router.route('*').all(function(req, res) {
	var oRes = {
		success: false,
		payload: {
			error: "Invalid path."
		}
	};
	var sResponse = JSON.stringify(oRes);
	res.type('json');
	res.status(401).send(sResponse);
});

module.exports = router;