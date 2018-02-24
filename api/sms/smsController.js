var request = require('request');
var logger = require('../../util/logger');
var config = require('../../config/config');
require('dotenv').config();

var dbURL = config.DB_URL;
var accountSid = config.TWILIO_SID; 
var authToken = config.TWILIO_AUTH_TOKEN; 
var client = require('twilio')(accountSid, authToken); 

/*** helper functions ***/
exports.sendCodeMessage = function(phoneNumber) {
	return new Promise(function(resolve, reject) {
		var intPhoneNumber = parseInt(phoneNumber);
		var tripInt = 3*intPhoneNumber + 1394;
		var sCode = tripInt.toString();
		if(sCode.length >= 4) {
			code = sCode.substring(sCode.length - 4);
		} else {
			code = "4923";
		}
		var message = "Thanks for downloading Sur5ive! Please enter this 4 digit code to verify your number: " + code;
		client.messages.create({ 
			to: "+1" + phoneNumber, 
			from: config.FROM_NUMBER, 
			body: message, 
		}, function(err, message) { 
			if(err) {
				reject(401);
			} else {
				resolve();
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
			to: "+1" + contact.PHONE_NUMBER, 
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

var prepareMessages = function(contacts, user, location) {
	var promisesArray =[];
	for (var j = 0; j < contacts.length; j++) {
		promisesArray.push(sendMessage(contacts[j], user, location));
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
			url: dbURL + '/logs'
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


exports.params = function(req, res, next, phoneNumber) {
	req.phoneNumber = phoneNumber;
	next();
};

/*** functions for routes ***/
exports.sendSMS = function(req, res, next) {
	var location = undefined;
	if (req.query.location !== undefined) {
		location = req.query.location;
	}
	var contacts = req.body.CONTACTS;
	if (contacts.length === 0) {
		throw new Error(406)
	}
	var user = req.body.USER
	prepareMessages(contacts, user, location)
	.then(addToLog.bind(null, user.PHONE_NUMBER.substring(user.PHONE_NUMBER.length - 4)))
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
				payload: {error: "No contacts exist. Cannot send message." }
			};
			var sResponse = JSON.stringify(oRes);
			res.type('json');
			res.status(406).send(sResponse);
		} else {
			console.log(err.message);
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