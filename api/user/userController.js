var request = require('request');
var _ = require('lodash');
var auth = require('../auth');
var config = require('../../config/config');
var validator = require('validator');
var logger = require('../../util/logger');
var smsController = require('../sms/smsController');
require('dotenv').config();

var hanaURL = config.HANA_URL;

/*** helper function copied from contactController ***/
var findAllContactsByUserId = function(returnObj) {
	var user_id = returnObj[0].USER_ID;
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/contacts?$filter=USER_ID%20eq%20' + user_id
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Error: userController, findAllContactsByUserId 1."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("Error: userController, findAllContactsByUserId 2."));
				}
			} else {
				body = JSON.parse(body);
				body = body.d;
				if(body.results.length === 0) {
					returnObj.push([])
					resolve(returnObj);
				} else {
					for(var i = 0; i< body.results.length; i++) {
						delete body.results[i].__metadata;
					}
					returnObj.push(body.results);
					resolve(returnObj);
				}
			}
		});
	});
};

/*** helper function copied from smsController ***/
var getLogByUserId = function(returnObj) {
	var user_id = returnObj[0].USER_ID;
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/logs?$filter=USER_ID%20eq%20' + user_id + '&$select=DATE&$orderby=DATE%20desc&$top=15'
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Error: userController, getLogByUserId 1."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("Error: userController, getLogByUserId 2."));
				}
			} else {
				body = JSON.parse(body);
				body = body.d;
				if(body.results.length === 0) {
					returnObj.push([])
					resolve(returnObj);
				} else {
					for(var i = 0; i< body.results.length; i++) {
						delete body.results[i].__metadata;
					}
					returnObj.push(body.results);
					resolve(returnObj);
				}
			}
		}); 
	});
};

/*** helper functions ***/
var findUserByUserId = function(user_id) {
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/users?$filter=USER_ID%20eq%20' + parseInt(user_id)
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Error: userController,findUserByUserId 1."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("Error: userController,findUserByUserId 2."));
				}
			} else {
				body = JSON.parse(body);
				if(body.d.results.length === 0) {
					// user does not exist
					reject(new Error("Error: userController,findUserByUserId 3."));
				} else {
					body = body.d.results[0];
					delete body.__metadata;
					resolve(body);
				}
			}
		}); 
	});
};

var findUserByEmail = function(email) {
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/users(\'' + email + '\')'
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Error: userController, findUserByEmail 1."));
			} else {
				switch (httpResponse.statusCode) {
					case 200:
						body = JSON.parse(body);
						body = body.d;
						delete body.__metadata;
						resolve(body);
						break;
					case 404:
						try {
							body = JSON.parse(body);
							if (body.error.message.value === "Resource not found.") {
								reject(405)
							} else {
								reject(new Error("Error: userController, findUserByEmail 2."));
							}
						}
						catch (err) {
								reject(new Error("Error: userController, findUserByEmail 3."));
						}
						break;
					default:
						reject(new Error("Error: userController, findUserByEmail 3."));
				}
			}
		}); 
	});
};

var createUserInDb = function(sBody) {
	return new Promise(function(resolve, reject) {
		request.post({
			headers: {
				"Content-Type":"application/json",
				"Accept":"application/json"
			},
			body: sBody,
			url: hanaURL + '/users'
		}, function(err, httpResponse, body) {
			if(err) {
				reject(new Error("Error: userController, createUserInDb 1."));
			} else {
				switch (httpResponse.statusCode) {
					case 201:
						body = JSON.parse(body);
						body = body.d;
						delete body.PASSWORD;
						delete body.__metadata;
						resolve(body);
						break;
					case 500:
						try {
							body = JSON.parse(body);
							if (body.error.message.value === "Service exception: [301] unique constraint violated") {
								reject(402)
							} else {
								reject(new Error("Error: userController, createUserInDb 2."));
							}
						}
						catch (err) {
								reject(new Error("Error: userController, createUserInDb 3."));
						}
						break;
					default:
						reject(new Error("Error: userController, createUserInDb 3."));
				}
			}
		});
	});
};

var checkCredentials = function(plainTextPword, arg) {
	let hashedPword = arg.PASSWORD;
	return new Promise(function(resolve, reject) {
		if(auth.authenticate(plainTextPword, hashedPword)) {
			resolve(arg);
		} else {
			reject(404);
		}
	})
};

var updateUserInDb = function(update, user) {
	_.merge(user, update);
	var sBody = JSON.stringify(user);
	return new Promise(function(resolve, reject) {
		request.put({
			headers: {
				"Content-Type":"application/json",
				"Accept":"application/json"
			},
			body: sBody,
			url: hanaURL + '/users(\'' + user.EMAIL + '\')'
		}, function(err, httpResponse, body) {
			if(err) {
				reject(new Error("Error: userController, updateUserInDb 1."));
			} else if (httpResponse.statusCode === 500) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("Error: userController, updateUserInDb 2."));
				}
			} else {
				resolve(user);
			}
		});
	});
};

var isValidId = function(some_id) {
	return new Promise(function(resolve, reject) {
		if(isNaN(some_id) || !Number.isInteger(parseFloat(some_id))) {
			reject(new Error("ID provided is not an integer"));
		} else {
			resolve(some_id);
		}
	});
};

exports.params = function(req, res, next, user_id) {
	req.user_id = user_id;
	next();
};

/*** functions for routes ***/
exports.getUser = function(req, res, next) {
	isValidId(req.user_id)
	.then(findUserByUserId)
	.then(function(arg) {
		delete arg.PASSWORD;
		var oRes = {
			success: true,
			payload: arg
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(200).send(sResponse);
	}).catch(function(err) {
		var oRes = {
			success: false,
			payload: {error: err.message}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(400).send(sResponse);
	});
};

exports.updateUser = function(req, res, next) {
	var update = {};
	if(req.body.hasOwnProperty("FIRST_NAME")) {
		req.checkBody('FIRST_NAME', 'First name is required.').notEmpty();
		req.checkBody('FIRST_NAME', 'First name must be between 1 - 10 characters.').isLength(1,20);
		update.FIRST_NAME = req.body.FIRST_NAME;
	}
	if (req.body.hasOwnProperty("LAST_NAME")) {
		req.checkBody('LAST_NAME', 'Last name is required.').notEmpty();
		req.checkBody('LAST_NAME', 'Last name must be between 1 - 10 characters.').isLength(1,20);
		update.LAST_NAME = req.body.LAST_NAME;
	}
	if (req.body.hasOwnProperty("PHONE_NUMBER")) {
		req.checkBody('PHONE_NUMBER', 'Phone number is required.').notEmpty();
		update.PHONE_NUMBER = req.body.PHONE_NUMBER;
	}
	if (req.body.hasOwnProperty("TIMER")) {
		req.checkBody('TIMER', 'TIMER must be an integer.').isInt();
		update.TIMER = req.body.TIMER;
	}
	if (req.body.hasOwnProperty("MESSAGE")) {
		req.checkBody('MESSAGE', 'Message is required.').notEmpty();
		update.MESSAGE = req.body.MESSAGE;
	}
	if (req.body.hasOwnProperty("PIN")) {
		req.checkBody('PIN', 'Pin must be an integer of 4 digits.').pinValidator();
		update.PIN = req.body.PIN;
	}

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
		res.status(403).send(sResponse);
	} else {
		isValidId(req.user_id)
		.then(findUserByUserId)
		.then(updateUserInDb.bind(null, update))
		.then(function(arg) {
			var user = arg;
			delete user.PASSWORD;
			var oRes = {
				success: true,
				payload: user
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(200).send(sResponse);
		}).catch(function(err) {
			var oRes = {
				success: false,
				payload: {error: err.message}
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(400).send(sResponse);
		});
	}
};

exports.signUp = function(req, res, next) {
	req.checkBody('EMAIL', 'email is required.').notEmpty();
	req.checkBody('EMAIL', 'email is not valid.').isEmail();
	req.checkBody('FIRST_NAME', 'First name is required.').notEmpty();
	req.checkBody('FIRST_NAME', 'First name must be between 2 - 10 characters.').isLength(2,20);
	req.checkBody('LAST_NAME', 'Last name is required.').notEmpty();
	req.checkBody('LAST_NAME', 'Last name must be between 2 - 10 characters.').isLength(2,20);
	req.checkBody('PHONE_NUMBER', 'Phone number must be 10 digits.').notEmpty();
	req.checkBody('PHONE_NUMBER', 'Phone number must be 10 digits.').phoneNumberValidator();
	req.checkBody('PASSWORD', 'Password is required.').notEmpty();
	req.checkBody('PASSWORD', 'Password must be between 6 - 14 characters.').isLength(6,12);
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
		newUser.EMAIL = req.body.EMAIL;
		newUser.FIRST_NAME = req.body.FIRST_NAME;
		newUser.LAST_NAME = req.body.LAST_NAME;
		newUser.PHONE_NUMBER = req.body.PHONE_NUMBER;
		newUser.PASSWORD = auth.encryptPassword(req.body.PASSWORD);
		newUser.PIN = req.body.PIN;
		newUser.PREFIX = "+1";
		newUser.TIMER = 5;
		newUser.MESSAGE = "Please give me a call. I may need your help.";
		
		var sNewUser = JSON.stringify(newUser);
		createUserInDb(sNewUser)
		.then(auth.signToken)
		.then(function(arg) {
			var oRes = {
				success: true,
				token:arg[1],
				payload: arg[0]
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(200).send(sResponse);
			try {
				smsController.sendNewUserMessage(arg[0]);
			}
			catch(err) {
				logger.log("error with sigup sms.");
				logger.log(err);
			}
		}).catch(function(err) {
			if (err === 402) {
				var oRes = {
				success: false,
				payload: {error: "User already exists with that email." }
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(402).send(sResponse);
			} else {
				var oRes = {
				success: false,
				payload: {error: err.message }
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(400).send(sResponse);
			}
		});
	}
};

exports.login = function(req, res, next) {
	var EMAIL = req.body.EMAIL;
	var PASSWORD = req.body.PASSWORD;
	findUserByEmail(EMAIL)
	.then(checkCredentials.bind(null, PASSWORD))
	.then(auth.signToken)
	.then(findAllContactsByUserId)
	.then(getLogByUserId)
	.then(function(arg) {
		delete arg[0].PASSWORD;
		arg[0].CONTACTS = arg[2];
		arg[0].LOGS = arg[3];
		var oRes = {
			success: true,
			token:arg[1],
			payload: arg[0]
			};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(200).send(sResponse);
	})
	.catch(function(err) {
		if (err === 404) {
				var oRes = {
				success: false,
				payload: {error: "The email or password is incorrect."}
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(404).send(sResponse);
			} else if (err === 405) {
				var oRes = {
				success: false,
				payload: {error: "User does not exist."}
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(405).send(sResponse);
			} else {
				var oRes = {
				success: false,
				payload: {error: err.message }
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(400).send(sResponse);
			}
	});
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