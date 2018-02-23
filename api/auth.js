
var jwt = require("jsonwebtoken");
var config = require('../config/config');

/*authentiction middleware*/
exports.signToken = function(phoneNumber) {
	return new Promise(function(resolve, reject) {
		if(phoneNumber === undefined) {
			reject(new Error('Phone number was not provided.'));
		} else {
			jwt.sign({ phoneNumber: phoneNumber }, config.secrets.jwt, function(err, token) {
				if(err) {
					reject(new Error(err));
				} else {
					resolve(token);
				}
			});
		}

	});
	
};

exports.decodeToken = function(req, res, next) {
	if (req.headers.authorization === undefined) {
		next(new Error('No token on the header.'));
	} else {
		jwt.verify(req.headers.authorization, config.secrets.jwt, function(err, decoded) {
			if(err) {
				next(new Error(err));
			} else if (!decoded.hasOwnProperty('phoneNumber')) {
				next(new Error('Corrupt token'));
			} else if(req.phoneNumber !== decoded.phoneNumber) {
				next(new Error("This token is not valid."));
			} else {
				next();
			}
		});
	}
};