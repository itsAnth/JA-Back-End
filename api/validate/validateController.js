var _ = require('lodash');
var auth = require('../auth');
var config = require('../../config/config');
var validator = require('validator');
var logger = require('../../util/logger');
require('dotenv').config();

var isValidId = function(some_id) {
	return new Promise(function(resolve, reject) {
		if(isNaN(some_id) || !Number.isInteger(parseFloat(some_id))) {
			reject(new Error("ID provided is not an integer"));
		} else {
			resolve(some_id);
		}
	});
};

exports.validateUser = function(req, res, next) {
	req.checkBody('FIRST_NAME', 'First name is required.').notEmpty();
	req.checkBody('FIRST_NAME', 'First name must be between 1 - 20 characters.').isLength(1,20);
	req.checkBody('LAST_NAME', 'Last name is required.').notEmpty();
	req.checkBody('LAST_NAME', 'Last name must be between 1 - 20 characters.').isLength(1,20);
	req.checkBody('PHONE_NUMBER', 'Phone number must be 10 digits.').notEmpty();
	req.checkBody('PHONE_NUMBER', 'Phone number must be 10 digits.').phoneNumberValidator();
	req.checkBody('PIN', 'PIN must be 4 digits.').pinValidator();

	var errors = req.validationErrors();

	if(errors){
		var errorMsg = '';
		for(var j = 0; j< errors.length;j++){
			if(j !== (errors.length-1)) {
				errorMsg += errors[j].msg + ' ';
			} else {
				errorMsg += errors[j].msg;
			}
		}
		var oRes = {
			success: false,
			payload: {error: errorMsg}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(403).send(sResponse); // validation error
	} else {
		var newUser = {};
		newUser.FIRST_NAME = req.body.FIRST_NAME;
		newUser.LAST_NAME = req.body.LAST_NAME;
		newUser.PHONE_NUMBER = req.body.PHONE_NUMBER;
		newUser.PIN = req.body.PIN;
		newUser.PREFIX = "+1";
		newUser.TIMER = 5;
		newUser.MESSAGE = "Please give me a call. I may need your help.";



		res.type('json');
		res.status(200).send(sResponse);
	}
};

exports.validateMessage = function(req, res, next) {
	req.checkBody('MESSAGE', 'Message is required.').notEmpty();
	req.checkBody('TIMER', 'TIMER must be an integer.').isInt();
	req.checkBody('PIN', 'PIN must be 4 digits.').pinValidator();

	var errors = req.validationErrors();

	if(errors){
		var errorMsg = '';
		for(var j = 0; j< errors.length;j++){
			if(j !== (errors.length-1)) {
				errorMsg += errors[j].msg + ' ';
			} else {
				errorMsg += errors[j].msg;
			}
		}
		var oRes = {
			success: false,
			payload: {error: errorMsg}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(403).send(sResponse); // validation error
	} else {
		res.type('json');
		res.status(200).send(sResponse);
	}
};

exports.validateContacts = function(req, res, next) {
	req.checkBody('FIRST_NAME', 'First name is required.').notEmpty();
	req.checkBody('FIRST_NAME', 'First name must be between 1 - 20 characters.').isLength(1,20);
	req.checkBody('LAST_NAME', 'Last name is required.').notEmpty();
	req.checkBody('LAST_NAME', 'Last name must be between 1 - 20 characters.').isLength(1,20);
	req.checkBody('PHONE_NUMBER', 'Phone number is required.').notEmpty();
	req.checkBody('PHONE_NUMBER', 'Phone number must contain only digits. Do not include country code, such as "+1"').phoneNumberValidator();

	var errors = req.validationErrors();

	if(errors){
		var errorMsg = '';
		for(var j = 0; j< errors.length;j++){
			if(j !== (errors.length-1)) {
				errorMsg += errors[j].msg + ' ';
			} else {
				errorMsg += errors[j].msg;
			}
		}
		var oRes = {
			success: false,
			payload: {error: errorMsg}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(403).send(sResponse); // validation error
	} else {
		
		var newContact = {};
		newContact.FIRST_NAME = req.body.FIRST_NAME;
		newContact.LAST_NAME = req.body.LAST_NAME;
		newContact.PHONE_NUMBER = req.body.PHONE_NUMBER;
		newContact.PREFIX = "+1";

		var sNewContact = JSON.stringify(newContact);
		res.type('json');
		res.status(200).send(sResponse);
	}
};

exports.validateCode = function(req, res, next) {
	req.checkBody('PHONE_NUMBER', 'Phone number is required.').notEmpty();
	req.checkBody('PHONE_NUMBER', 'Phone number must contain only digits. Do not include country code, such as "+1"').phoneNumberValidator();
	req.checkBody('CODE', 'Code must be 4 digits.').isLength(4);
	req.checkBody('CODE', 'Invalid code.').codeValidator(req.body.PHONE_NUMBER);


	var errors = req.validationErrors();

	if(errors){
		var errorMsg = '';
		for(var j = 0; j< errors.length;j++){
			if(j !== (errors.length-1)) {
				errorMsg += errors[j].msg + ' ';
			} else {
				errorMsg += errors[j].msg;
			}
		}
		var oRes = {
			success: false,
			payload: {error: errorMsg}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(403).send(sResponse); // validation error
	} else {
		auth.signToken(req.body.PHONE_NUMBER);
		res.type('json');
		res.status(200).send(sResponse);
	}
};

exports.badPath = function(req, res, next) {
	var oRes = {
		success: false,
		payload: {
			error: "Invalid path."
		}
	};
	var sResponse = JSON.stringify(oRes);
	res.type('json');
	res.status(401).send(sResponse);
};