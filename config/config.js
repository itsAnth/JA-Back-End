var _ = require('lodash');
require('dotenv').config()
var config = {
	development:'development',
	production:'production',
	port: process.env.PORT || 5000,
	secrets: {
		jwt: process.env.JWT || 'sosmsisthebest'
	}
};

// if there is no predetermined node env, use dev
process.env.NODE_ENV = process.env.ENVIRONMENT || config.development;
config.env = process.env.NODE_ENV;

var envConfig;
// require could error out if
// the file don't exist so lets try this statement
// and fallback to an empty object if it does error out
try {
  envConfig = require('./' + config.env);
  // just making sure the require actually
  // got something back :)
  envConfig = envConfig || {};
} catch(e) {
  envConfig = {};
}

// merge the two config files together
// the envConfig file will overwrite properties
// on the config object
module.exports = _.merge(config, envConfig);