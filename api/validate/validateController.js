var _ = require('lodash');
var auth = require('../auth');
var config = require('../../config/config');
var validator = require('validator');
var logger = require('../../util/logger');
var smsController = require('../sms/smsController');
require('dotenv').config();



exports.params = function(req, res, next, phone_number) {
	req.phone_number = phone_number;
	next();
};

exports.sendCode = function(req,res, next) {
	try {
		smsController.sendCodeMessage(req.phone_number)
		.then(function() {
			var oRes = {
				success: false,
				payload: {}
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(200).send(sResponse);
		}).catch(function(err) {
			if (err === 401) {
				var oRes = {
					success: false,
					payload: {error: "Could not send code to provided number." }
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(402).send(sResponse);
			} else {
				console.log(err);
				var oRes = {
					success: false,
					payload: {error: "Something went wrong with your request." }
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(400).send(sResponse);
			}
		})
	} catch(err) {
		var oRes = {
			success: false,
			payload: {error: "Something went wrong with your request." }
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(400).send(sResponse);
	}
}

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
		auth.signToken(req.body.PHONE_NUMBER)
		.then(function(token) {
			var oRes = {
				success: false,
				token:token,
				payload: {}
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(200).send(sResponse);
		})
		.catch(function(err) {
			console.log(err);
			var oRes = {
				success: false,
				payload: {error: "Something went wrong with your request." }
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(400).send(sResponse);
		});
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