/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

// #############################################################################
// read cmd line args

var defaultRules = './rules/rules.txt';

var opts = require('./lib/tav.js').set({
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
}, "Hoxy, the web-hacking proxy.\nusage: node hoxy.js [--debug] [--rules=file] [--port==port]");

// done reading args
// #############################################################################
// declare stuff

var HTTP  = require('http');
var URL   = require('url');
var HTS   = require('./lib/http-transaction-state.js');
var Q     = require('./lib/asynch-queue.js');
var RULES = require('./lib/rules.js');
var RDB   = require('./lib/rules-db.js');

var projectName = 'hoxy';
var proxyPort = opts.port || 8080;
var debug = opts.debug;

if (opts.args.length && parseInt(opts.args[0])) {
	console.log('!!! old: please use --port=something to specify port. thank you. exiting.');
	process.exit(1);
}

// done declaring
// #############################################################################
// error handling and subs

function turl(url){
	if (url.length > 64) {
		var pUrl = URL.parse(url);
		var nurl = pUrl.protocol + '//' + pUrl.host;
		nurl += '/...'+url.substring(url.length-10, url.length);
		url = nurl;
	}
	return url;
}

function logError(err, errType, url) {
	if (debug) {
		console.log(errType+' error: '+turl(url)+': '+err.message);
	}
}

// helps to ensure the proxy stays up and running
process.on('uncaughtException',function(err){
	if (debug) {
		console.log('uncaught exception: '+err.message);
		console.log(err.stack);
	}
});

// end err handling
// #############################################################################
// create proxy server

HTTP.createServer(function(request, response) {

	// TODO support gzip dammit
	delete request.headers['accept-encoding'];

	// handle these noisy error sources with less verbose errors
	request.socket.on("error",function(err){
		logError(err,'REQUEST', request.url);
	});
	response.socket.on("error",function(err){
		logError(err,'RESPONSE', request.url);
	});

	// grab fresh copy of rules for each request
	var rules = RDB.getRules();

	var hts = new HTS.HttpTransactionState();
	hts.setRequest(request, function(reqInfo){
		// entire request body is now loaded
		// process request phase rules
		var reqPhaseRulesQ = new Q.AsynchQueue();
		rules.forEach(function(rule){
			if(rule.phase==='request'){
				reqPhaseRulesQ.push(rule.getExecuter(hts));
			}
		});

		reqPhaseRulesQ.execute(function(){

			// request phase rules are now done processing. try to send the
			// response directly without hitting up the server for a response.
			// obviously, this will only work if the response was somehow
			// already populated, e.g. during request-phase rule processing
			try {
				hts.doResponse(sendResponse);
			} catch (ex) {

				// make sure content-length jibes
				if (!reqInfo.body.length) {
					reqInfo.headers['content-length'] = 0;
				} else if (reqInfo.headers['content-length']!==undefined) {
					var len = 0;
					reqInfo.body.forEach(function(chunk){
						len += chunk.length;
					});
					reqInfo.headers['content-length'] = len;
				} else { /* node will send a chunked request */ }

				// make sure host header jibes
				if(reqInfo.headers.host){
					reqInfo.headers.host = reqInfo.hostname;
					if (reqInfo.port !== 80) {
						reqInfo.headers.host += ':'+reqInfo.port;
					}
				}

				var proxy = HTTP.createClient(reqInfo.port, reqInfo.hostname);

				// create request, queue up body writes, execute it
				var proxyReq = proxy.request(
					reqInfo.method,
					reqInfo.url,
					reqInfo.headers
				);
				proxyReq.socket.on("error",function(err){
					logError(err,'PROXY REQUEST', request.url);
				});
				var reqBodyQ = new Q.AsynchQueue();
				reqInfo.body.forEach(function(chunk){
					reqBodyQ.push(function(notifier){
						proxyReq.write(chunk);
						setTimeout(function(){
							notifier.notify();
						}, reqInfo.throttle);
					});
				});
				reqBodyQ.execute(function(){
					proxyReq.end();
				});

				// handle response from server
				proxyReq.on('response', function(proxyResp){
					proxyResp.socket.on("error",function(err){
						logError(err,'PROXY RESPONSE', request.url);
					});
					hts.setResponse(proxyResp, sendResponse);
				});
			}

			// same subroutine used in either case
			function sendResponse(respInfo) {

				// entire response body is now available
				// do response phase rule processing
				var respPhaseRulesQ = new Q.AsynchQueue();
				rules.forEach(function(rule){
					if(rule.phase==='response'){
						respPhaseRulesQ.push(rule.getExecuter(hts));
					}
				});

				respPhaseRulesQ.execute(function(){

					// response phase rules are now done processing
					// send response, but first drop this little hint
					// to let client know something fishy's going on
					respInfo.headers['x-manipulated-by'] = projectName;

					// shore up the content-length situation
					if (!respInfo.body.length) {
						respInfo.headers['content-length'] = 0;
					} else if (respInfo.headers['content-length']!==undefined) {
						var len = 0;
						respInfo.body.forEach(function(chunk){
							len += chunk.length;
						});
						respInfo.headers['content-length'] = len;
					} else { /* node will send a chunked response */ }

					// write headers, queue up body writes, send, end and done
					response.writeHead(respInfo.statusCode, respInfo.headers);
					var respBodyQ = new Q.AsynchQueue();
					respInfo.body.forEach(function(chunk){
						respBodyQ.push(function(notifier){
							response.write(chunk);
							setTimeout(function(){
								notifier.notify();
							}, respInfo.throttle);
						});
					});
					respBodyQ.execute(function(){
						response.end();
					});
				});
			}
		});
	});
}).listen(proxyPort);

// done creating proxy
// #############################################################################
// print a nice info message

console.log(projectName+' running at http://localhost:'+proxyPort);
if (debug) console.log('debug mode is on');






