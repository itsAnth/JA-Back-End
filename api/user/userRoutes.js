var router = require('express').Router();
var controller = require('./userController');
var auth = require('../auth');

var authCheck = [auth.decodeToken];

// this middleware will run when a parameter is in the route
router.param('user_id', controller.params);

// this allow you to change user information.
router.route('/find/:user_id').get(auth.decodeToken, controller.getUser);


router.route('/update/:user_id').put(auth.decodeToken, controller.updateUser);

router.route('/signup').post(controller.signUp);
router.route('/login').post(controller.login);

// this will run if there is no email in the request
router.route('*').all(controller.badPath);

module.exports = router;