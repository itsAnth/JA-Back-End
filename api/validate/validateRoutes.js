var router = require('express').Router();
var controller = require('./validateController');
var auth = require('../auth');

var authCheck = [auth.decodeToken];

router.route('/user').post(controller.validateUser);

// this will run if there is no email in the request
router.route('*').all(controller.badPath);

module.exports = router;