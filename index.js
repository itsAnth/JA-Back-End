var express = require('express');
var api = require('./api/api');
var config = require('./config/config');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var expressValidator = require('express-validator');
var path = require("path");

require('dotenv').config();

process.env.ENVIRONMENT = process.env.ENVIRONMENT || 'development';
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(expressValidator({
	customValidators: {
		pinValidator: function(input) {
			if(input.length === 4 && !(isNaN(input))) {
				return true;
			} else {
				return false;
			}
		},
		phoneNumberValidator: function(input) {
			if(input.length === 10 && !(isNaN(input))) {
				return true;
			} else {
				return false;
			}
		},
		codeValidator: function(input, phoneNumber) {
			try {
				if(input.length === 4 && !(isNaN(input))) {
					var intPhoneNumber = parseInt(phoneNumber);
					var tripInt = 3*intPhoneNumber + 1394;
					var sCode = tripInt.toString();
					if(sCode.length >= 4) {
						var code = sCode.substring(sCode.length - 4);
						return input == code
					} else {
						return input == "4923";
					}
				} else {
					return false;
				}
			}
			catch (err) {
				return false;
			}
		},
	}
}));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/', api);
// setup global error handling
app.use(function(err, req, res, next) {
	var errMessage;
	if (err.name  === 'UnauthorizedError') {
		errMessage = 'Invalid Token';
	} else if(err.message === '') {
		errMessage = 'Something went wrong with your request.';
	} else if(err.message === "406") {
		errMessage = 'Contact does not exist.';
	} else {
		errMessage = err.message;
	}
	var oRes = {
		success: false,
		payload: {error: errMessage}
	};
	var sResponse = JSON.stringify(oRes);
	res.type('json');
	switch(err.message) {
		case "406":
		res.status(406).send(sResponse);
		break;
		default:
		res.status(400).send(sResponse);
	}
});

app.listen(config.port, function() {
	console.log('Node app is running on port', config.port);
});