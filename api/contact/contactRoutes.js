var router = require('express').Router();
var controller = require('./contactController');
var auth = require('../auth');

// this middleware will run when a parameter is in the route
router.param('user_id', controller.paramUserId);
router.param('contact_id', controller.paramContactId);

// get or update contacts
router.route('/all/:user_id').get(auth.decodeToken, controller.getAllContactsForUser);
router.route('/new').post(controller.preCheckCreateContact, auth.decodeToken, controller.createContact);
router.route('/update/:contact_id').put(controller.preCheckContactEditDelete, auth.decodeToken, controller.updateContact)

router.route('/delete/:contact_id').delete(controller.preCheckContactEditDelete, auth.decodeToken, controller.deleteContact);

// this will run if there is no email in the request
router.route('*').all(controller.badPath);

module.exports = router;