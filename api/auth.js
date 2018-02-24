
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
		console.log("body is");
		console.log(req.body);
		if(req.phoneNumber = undefined) {
			try {
				req.phoneNumber = req.body.USER.PHONE_NUMBER;
			} catch(err) {
				reject(new Error("No req.phoneNumber"));
			}
		}
		jwt.verify(req.headers.authorization, config.secrets.jwt, function(err, decoded) {
			if(err) {
				next(new Error(err));
			} else if (!decoded.hasOwnProperty('phoneNumber')) {
				next(new Error('Corrupt token'));
			} else if(req.phoneNumber !== decoded.phoneNumber) {
				console.log("decoded number is");
				console.log(decoded.phoneNumber);
				next(new Error("This token is not valid."));
			} else {
				next();
			}
		});
	}
};