var router = require('express').Router();
var path    = require("path");
var logger = require('../util/logger');

router.use('/contact', require('./contact/contactRoutes'));
router.use('/sms', require('./sms/smsRoutes'));
router.use('/user', require('./user/userRoutes'));
router.route('/').get(function(req, res) {
	res.sendFile(path.join(__dirname+'/../html/routes.html'));
});
router.route('/database').get(function(req, res) {
	res.sendFile(path.join(__dirname+'/../html/database.html'));
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