
var bcrypt = require('bcrypt-nodejs');
var jwt = require("jsonwebtoken");
var config = require('../config/config');
exports.authenticate = function(plainTextPword, hashedPword) {
	return bcrypt.compareSync(plainTextPword, hashedPword);
};

exports.encryptPassword = function(plainTextPword) {
	if(!plainTextPword) {
		return '';
	} else {
		var salt = bcrypt.genSaltSync(10);
		return bcrypt.hashSync(plainTextPword, salt);
	}
};

/*authentiction middleware*/
exports.signToken = function(user) {
	return new Promise(function(resolve, reject) {
		if(user.USER_ID === undefined) {
			reject(new Error('user_id was not provided.'));
		} else {
			jwt.sign({ user_id: user.USER_ID }, config.secrets.jwt, function(err, token) {
				if(err) {
					reject(new Error(err));
				} else {
					resolve([user, token]);
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
			} else if (!decoded.hasOwnProperty('user_id')) {
				next(new Error('Corrupt token'));
			} else if(req.user_id !== decoded.user_id) {
				next(new Error("User and token do not match."));
			} else {
				next();
			}
		});
	}
};