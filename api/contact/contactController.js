var request = require('request');
var _ = require('lodash');
var config = require('../../config/config');
var validator = require('validator');
var logger = require('../../util/logger');
require('dotenv').config();

var hanaURL = config.HANA_URL;

/*** precheck functions ***/
exports.preCheckCreateContact = function(req, res, next) {
	if(!req.body.hasOwnProperty("USER_ID")) {
		next(new Error("USER_ID was not included in the body"));
	} else {
		req.user_id = req.body.USER_ID.toString();
		next();
	}
};

exports.preCheckContactEditDelete = function(req, res, next) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/contacts(' + req.contact_id + ')'
		}, (err, httpResponse, body) => {
			if (err) {
				next(new Error("Error: contactController, precheckContact 1."));
			} else {
				switch (httpResponse.statusCode) {
					case 200:
						body = JSON.parse(body);
						body = body.d;
						req.user_id = body.USER_ID.toString();
						next();
						break;
					case 404:
						try {
							body = JSON.parse(body);
							if (body.error.message.value === "Resource not found.") {
								next(new Error(406));
							} else {
								next(new Error("Error: contactController, precheckContact 2."));
							}
						}
						catch (err) {
								next(new Error("Error: contactController, precheckContact 3."));
						}
						break;
					default:
						next(new Error("Error: contactController, precheckContact 4."));
				}
			}
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
				reject(new Error("Something went wrong in the contactController, findUserByUserId."));
			} else if (httpResponse.statusCode === 500) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in contactController, findUserByUserId. User may not exist"));
				}
			} else {
				body = JSON.parse(body);
				if(body.d.results.length === 0) {
					reject(new Error("User does not exist for the USER_ID given."));
				} else {
					body = body.d.results[0];
					delete body.__metadata;
					resolve(body);
				}
			}
		}); 
	});
};

var checkContactsCount = function(arg) {
	console.log(arg);
	var user_id = arg.USER_ID;
	console.log(user_id);
	var urlEnd = '/contacts/$count?$filter=USER_ID%20eq%20' + user_id
	console.log(urlEnd);
	return new Promise(function(resolve, reject) {
		request({
			url:hanaURL + '/contacts/$count?$filter=USER_ID%20eq%20' + user_id
		}, (err, httpResponse, body) => {
			

			if (err) {
				reject(new Error("Something went wrong in the contactController, checkContactsCount 1."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					console.log(httpResponse.body.error.message);
				}
				reject(new Error("There was an error in contactController, checkContactsCount 2."));
			} else {
				try {
					var contactsNum = parseInt(body);
					if (contactsNum < 5) {
						resolve(arg);
					} else {
						reject(408);
					}
				}
				catch (err) {
					reject(new Error("There was an error in contactController, checkContactsCount 3."));
				}
				
			}


		}); 
	});
};

var findContactByContactId = function(contact_id) {
	return new Promise(function(resolve, reject) {
		request({
			headers: {
				"Accept":"application/json"
			},
			url:hanaURL + '/contacts(' + contact_id + ')'
		}, (err, httpResponse, body) => {
			if (err) {
				reject(new Error("Something went wrong in the contactController, findContactByContactId."));
			} else if (httpResponse.statusCode !== 200) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in contactController, findContactByContactId. Contact may not exist"));
				}
			} else {
				body = JSON.parse(body);
				body = body.d;
				delete body.__metadata;
				resolve(body);
			}
		});
	});
};

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

var createContactInDb = function(sBody) {
	return new Promise(function(resolve, reject) {
		request.post({
			headers: {
				"Content-Type":"application/json",
				"Accept":"application/json"
			},
			body: sBody,
			url: hanaURL + '/contacts'
		}, function(err, httpResponse, body) {
			if(err) {
				reject(new Error("There was an error in contactController, createContactInDb"));
			} else if (httpResponse.statusCode === 500) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in contactController, createContactInDb. Possible duplicate"));
				}
			} else {
				body = JSON.parse(body);
				delete body.d.__metadata;
				body = body.d;
				resolve(body);
			}
		});
	});
};

var updateContactInDb = function(update, contact) {
	_.merge(contact, update);
	var sBody = JSON.stringify(contact);
	return new Promise(function(resolve, reject) {
		request.put({
			headers: {
				"Content-Type":"application/json",
				"Accept":"application/json"
			},
			body: sBody,
			url: hanaURL + '/contacts(' + contact.CONTACT_ID + ')'
		}, function(err, httpResponse, body) {
			if(err) {
				reject(new Error("There was an error in contactController, updateContactInDb"));
			} else if (httpResponse.statusCode === 500) {
				httpResponse.body = JSON.parse(httpResponse.body);
				if(httpResponse.body.hasOwnProperty("error")) {
					reject(new Error(httpResponse.body.error.message));
				} else {
					reject(new Error("There was an error in contactController, updateContactInDb."));
				}
			} else {
				resolve(contact);
			}
		});
	});
};

var deleteContactInDb = function(contact_id) {
	return new Promise(function(resolve, reject) {
		request.delete({
			headers: {
				"Content-Type":"application/json",
				"Accept":"application/json"
			},
			url: hanaURL + '/contacts(' + contact_id + ')'
		}, function(err, httpResponse, body) {
			if(err) {
				reject(new Error("There was an error in contactController, deleteContactInDb 1."));
			} else {
				switch (httpResponse.statusCode) {
					case 204:
						resolve("Removed contact from db.");
						break;
					case 404:
						try {
							body = JSON.parse(body);
							if (body.error.message.value === "Resource not found.") {
								reject(406)
							} else {
								reject(new Error("Error: contactController, deleteContactInDb 2."));
							}
						}
						catch (err) {
								reject(new Error("Error: contactController, deleteContactInDb 3."));
						}
						break;
					default:
						reject(new Error("Error: contactController, deleteContactInDb 3."));
				}
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

exports.paramUserId = function(req, res, next, user_id) {
	req.user_id = user_id;
	next();
};

exports.paramContactId = function(req, res, next, contact_id) {
	req.contact_id = contact_id;
	next();
};

/*** functions for routes ***/
exports.getAllContactsForUser = function(req, res) {
	isValidId(req.user_id)
	.then(findAllContactsByUserId)
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
		if (err === 406) {
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

exports.createContact = function(req, res) {
	req.checkBody('USER_ID', 'User id is required').notEmpty();
	req.checkBody('USER_ID', 'User id must be an integer').isInt();
	req.checkBody('FIRST_NAME', 'First name is required.').notEmpty();
	req.checkBody('FIRST_NAME', 'First name must be between 1 - 20 characters.').isLength(1,20);
	req.checkBody('LAST_NAME', 'Last name is required.').notEmpty();
	req.checkBody('LAST_NAME', 'Last name must be between 1 - 20 characters.').isLength(1,20);
	req.checkBody('PHONE_NUMBER', 'Phone number is required.').notEmpty();
	req.checkBody('PHONE_NUMBER', 'Phone number must contain only digits. Do not include country code, such as "+1"').isInt();

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
		findUserByUserId(req.body.USER_ID)
		.then(checkContactsCount)
		.then(function(arg) {
			var PHONE_NUMBER = req.body.PHONE_NUMBER;
			var newContact = {};
			newContact.CONTACT_ID = 1;
			newContact.USER_ID = req.body.USER_ID;
			newContact.FIRST_NAME = req.body.FIRST_NAME;
			newContact.LAST_NAME = req.body.LAST_NAME;
			newContact.PHONE_NUMBER = PHONE_NUMBER.toString();
			newContact.PREFIX = "+1";

			var sNewContact = JSON.stringify(newContact);
			createContactInDb(sNewContact)
			.then(function(arg) {
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
		}).
		catch(function(err) { // if no user exists
			if (err === 408) {
				var oRes = {
				success: false,
				payload: {error: "Max number of contacts is 5."}
				};
				var sResponse = JSON.stringify(oRes);
				res.type('json');
				res.status(408).send(sResponse);
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

exports.updateContact = function(req, res) {
	var update = {};
	if(req.body.hasOwnProperty("FIRST_NAME")) {
		req.checkBody('FIRST_NAME', 'First name is required.').notEmpty();
		req.checkBody('FIRST_NAME', 'First name must be between 1 - 20 characters.').isLength(1,20);
		update.FIRST_NAME = req.body.FIRST_NAME;
	}
	if (req.body.hasOwnProperty("LAST_NAME")) {
		req.checkBody('LAST_NAME', 'Last name is required.').notEmpty();
		req.checkBody('LAST_NAME', 'Last name must be between 1 - 10 characters.').isLength(1,20);
		update.LAST_NAME = req.body.LAST_NAME;
	}
	if (req.body.hasOwnProperty("PHONE_NUMBER")) {
		req.checkBody('PHONE_NUMBER', 'Phone number is required.').notEmpty();
		req.checkBody('PHONE_NUMBER', 'Phone number must contain only digits. Do not include country code, such as "+1"').isInt();
		update.PHONE_NUMBER = req.body.PHONE_NUMBER;
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
		isValidId(req.contact_id)
		.then(findContactByContactId)
		.then(updateContactInDb.bind(null, update))
		.then(function(arg) {
			var contact = arg;
			var oRes = {
				success: true,
				payload: contact
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

exports.deleteContact = function(req, res) {
	console.log("in delete")
	isValidId(req.contact_id)
	.then(deleteContactInDb)
	.then(function(arg) {
		var oRes = {
			success: true,
			payload: {}
		};
		var sResponse = JSON.stringify(oRes);
		res.type('json');
		res.status(200).send(sResponse);
	})
	.catch(function(err) {
		console.log("in error")
		if (err === 406) {
			var oRes = {
				success: false,
				payload: {error: "Contact does not exist."}
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
	})
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