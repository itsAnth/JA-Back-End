var router = require('express').Router();
var controller = require('./validateController');
var auth = require('../auth');

var authCheck = [auth.decodeToken];

// this middleware will run when a parameter is in the route
router.param('phone_number', controller.params);

router.route('/decode').post(controller.validateCode);
router.route('/code/phone_number').get(controller.sendCode);

// this will run if there is no email in the request
router.route('*').all(controller.badPath);

module.exports = router;