var router = require('express').Router();
var controller = require('./smsController');
var auth = require('../auth');

// this middleware will run when a parameter is in the route
router.param('user_id', controller.params);

// this will send the sos
router.route('/send/:user_id').get(auth.decodeToken, controller.sendSMS);
router.route('/logs/:user_id').get(auth.decodeToken, controller.getLogs);

// this will run if there is no email in the request
router.route('*').all(controller.badPath);

module.exports = router;