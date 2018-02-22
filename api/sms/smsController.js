var request = require('request');
var logger = require('../../util/logger');
var config = require('../../config/config');
require('dotenv').config();

var hanaURL = config.HANA_URL;
var accountSid = config.TWILIO_SID; 
var authToken = config.TWILIO_AUTH_TOKEN; 
var client = require('twilio')(accountSid, authToken); 

/*** helper functions ***/
var findAllContactsByUserId = function(user_id) {
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/contacts?$filter=USER_ID%20eq%20' + user_id
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Something went wrong in the contactController, findAllContactsByUserId."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in contactController, findAllContactsByUserId."));
				}
			} else {
				body = JSON.parse(body);
				body = body.d;
				if(body.results.length === 0) {
					reject(406);
				} else {
					for(var i = 0; i< body.results.length; i++) {
						delete body.results[i].__metadata;
					}
					resolve(body.results);
				}
				
			}
		});
	});
};

var findMessageByUserId = function(user_id, contacts) {
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/users?$filter=USER_ID%20eq%20' + parseInt(user_id) + '&$select=FIRST_NAME,LAST_NAME,MESSAGE'
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Something went wrong in the smsController, findMessageByUserId."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in smsController, findUserByUserId. User may not exist"));
				}
			} else {
				body = JSON.parse(body);
				if(body.d.results.length === 0) {
					reject(new Error("User does not exist"));
				} else {
					body = body.d.results[0];
					delete body.__metadata;
					var oReturn = {};
					oReturn.body = body;
					oReturn.contacts = contacts;
					resolve(oReturn);
				}
			}
		}); 
	});
};

var getLogByUserId = function(user_id) {
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/logs?$filter=USER_ID%20eq%20' + user_id + '&$select=DATE&$orderby=DATE%20desc&$top=15'
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Something went wrong in the smsController, getLogsByUserId."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in smsController, getLogsByUserId."));
				}
			} else {
				body = JSON.parse(body);
				body = body.d;
				if(body.results.length === 0) {
					reject(405);
				} else {
					for(var i = 0; i< body.results.length; i++) {
						delete body.results[i].__metadata;
					}
					resolve(body.results);
				}
			}
		}); 
	});
};


exports.sendNewUserMessage = function(user) {
	console.log(user);
	var message = "Welcome to Sur5ive, "+ user.FIRST_NAME + "! We are a youth startup with a passion for safety and technology. Add upto 5 emergency contacts in the Sur5ive application.You can enable the swipe and slide outside button to use Sur5ive without looking at your device. Add your number to the contacts list and try it out! Please DO NOT respond to this message.";
	client.messages.create({ 
		to: user.PREFIX + user.PHONE_NUMBER, 
		from: config.FROM_NUMBER, 
		body: message, 
	}, function(err, message) { 
		if(err) {
			console.log(err);
		} else {
			console.log("sent message");
		}
	});
};

var sendMessage = function(contact, user, location) {
	var message = "To " + contact.FIRST_NAME + " from " + user.FIRST_NAME + " " + user.LAST_NAME + ", " + user.MESSAGE;
	var messageEnding = "Sent by the sur5ive application. Please do not respond to this message.";
	message = message + messageEnding;
	if (location !== undefined) {
		var location = ". Current location: " + "https://www.google.com/maps/search/?api=1&query=" + location;
		message = message + location;
	}
	return new Promise(function(resolve, reject) {
		client.messages.create({ 
			to: contact.PREFIX + contact.PHONE_NUMBER, 
			from: config.FROM_NUMBER, 
			body: message, 
		}, function(err, message) { 
			if(err) {
				console.log(err);
				reject(new Error('something went wrong in the smsController, sendMessage'));
			} else {
				resolve(contact);
			}
		});
	});
};

var prepareMessages = function(location, arg) {
	var contacts = arg.contacts;
	var body = arg.body;
	var promisesArray =[];
	for (var j = 0; j < contacts.length; j++) {
		promisesArray.push(sendMessage(contacts[j], body, location));
	}
	return Promise.all(promisesArray)
	.then(function(promisesArgs) {
		return promisesArgs;
	})
};

var addToLog = function(user_id, contacts) {
	var oBody = {};
	oBody.USER_ID = user_id;
	oBody.LOG_ID = 1;
	var sBody = JSON.stringify(oBody);
	return new Promise(function(resolve, reject) {
		request.post({
			headers: {
				"Content-Type":"application/json",
				"Accept":"application/json"
			},
			body: sBody,
			url: hanaURL + '/logs'
		}, function(err, httpResponse, body) {
			if(err || httpResponse.statusCode !== 201) {
				var oResponse = {};
				oResponse.logError = "log error";
				oResponse.contacts = contacts;
				reject(new Error(oResponse));
			} else {
				resolve(contacts);
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
exports.sendSMS = function(req, res, next) {
	var location = undefined;
	if (req.query.location !== undefined) {
		location = req.query.location;
	}
	isValidId(req.user_id)
	.then(findAllContactsByUserId)
	.then(findMessageByUserId.bind(null, req.user_id))
	.then(prepareMessages.bind(null, location))
	.then(addToLog.bind(null, req.user_id))
	.then(function(arg) {
		var contacts = arg;
		var oRes = {
			success: true,
			payload: {
				results: contacts
			}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(200).send(sResponse);
	})
	.catch(function(err) {
		if(err.hasOwnProperty('logError')) {
			var oRes = {
				success: true,
				payload: {
					error: "Log error but sent message.",
					results: err.contacts
				}
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(200).send(sResponse);
		} else if (err === 406) {
			var oRes = {
				success: false,
				payload: {error: "No contacts exist for user." }
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(406).send(sResponse);
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

exports.getLogs = function (req, res, next) {
	getLogByUserId(req.user_id)
	.then(function(arg) {
		var oRes = {
			success: true,
			payload: {
				results: arg
			}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(200).send(sResponse);
	}).catch(function(err) {
		if (err === 405) {
			var oRes = {
				success: false,
				payload: {error: "No logs exist for user." }
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