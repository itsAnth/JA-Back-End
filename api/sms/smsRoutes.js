var router = require('express').Router();
var controller = require('./smsController');
var auth = require('../auth');

// this middleware will run when a parameter is in the route
router.param('phoneNumber', controller.params);

// this will send the sos
router.route('/send').post(auth.decodeToken, controller.sendSMS);

// this will run if there is no email in the request
router.route('*').all(controller.badPath);

module.exports = router;