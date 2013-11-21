/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

// #############################################################################
// read cmd line args and declare stuff

var defaultRules = './hoxy-rules.txt';
var projectName = 'Hoxy';

var opts = require('tav').set({
	debug: {
		note: 'Turn on debug mode, print errors to console.',
		value: false,
	},
	rules: {
		note: 'Specify rules file other than default. (default '+defaultRules+')',
		value: defaultRules,
	},
	port: {
		note: 'Specify port to listen on. (default 8080)',
		value: 8080,
	},
	stage: {
		note: 'Host that '+projectName+' will act as a staging server for.',
		value: false,
	},
	'no-version-check': {
		note: 'Attempt to run '+projectName+' without the startup version check.',
		value: false,
	},
}, "Hoxy, the web-hacking proxy.\nusage: node hoxy.js [--debug] [--rules=file] [--port=port]");

if (opts.args.length && parseInt(opts.args[0])) {
    console.error('!!! old: please use --port=something to specify port. thank you. exiting.');
    process.exit(1);
}

require('./runner.js')(projectName, opts);

// helps to ensure the proxy stays up and running
process.on('uncaughtException',function(err){
    if (debug) {
        console.error('uncaught exception: '+err.message);
        console.error(err.stack);
    }
});