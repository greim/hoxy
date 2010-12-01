/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

// #############################################################################
// declare stuff

var HTTP  = require('http');
var URL   = require('url');
var HTS   = require('./lib/http-transaction-state.js');
var Q     = require('./lib/asynch-queue.js');
var RULES = require('./lib/rules.js');
var RDB   = require('./lib/rules-db.js');

var projectName = 'hoxy';
var proxyHost = 'localhost';
var proxyPort = 8080;

// done declaring vars
// #############################################################################
// read command line args

try{
	var portArg = parseInt(process.argv[2]);
	if(portArg && portArg > 0){
		proxyPort = portArg;
	}
}catch(ex){}

// done reading args
// #############################################################################
// create proxy server

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
	// TODO: add cmd line option to log
	//console.log(errType+' error: '+turl(url)+': '+err.message);
}

HTTP.createServer(function(request, response) {
	delete request.headers['accept-encoding']; // TODO support gzip
	request.socket.on("error",function(err){
		logError(err,'REQUEST', request.url);
	});
	response.socket.on("error",function(err){
		logError(err,'RESPONSE', request.url);
	});
	var rules = RDB.getRules(); // grab fresh copy of rules for each request

	var hts = new HTS.HttpTransactionState();
	hts.setRequest(request, function(reqInfo){
		var reqPhaseQ = new Q.AsynchQueue();
		rules.forEach(function(rule){
			if(rule.phase==='request'){
				reqPhaseQ.push(rule.getExecuter(hts));
			}
		});
		reqPhaseQ.on('done',function(){
			function sendResponse(respInfo) {
				var respPhaseQ = new Q.AsynchQueue();
				rules.forEach(function(rule){
					if(rule.phase==='response'){
						respPhaseQ.push(rule.getExecuter(hts));
					}
				});
				respPhaseQ.on('done', function(){
					respInfo.headers['x-manipulated-by'] = projectName;
					response.writeHead(respInfo.status, respInfo.headers);
					var throt = respInfo.throttle || 0;
					var respQ = new Q.AsynchQueue();
					respInfo.body.forEach(function(chunk){
						respQ.push(function(notifier){
							response.write(chunk);
							setTimeout(function(){
								notifier.notify();
							}, throt);
						});
					});
					respQ.on('done', function(){
						response.end();
					});
					respQ.start();
				});
				respPhaseQ.start();
			}
			try {
				// this fails unless something has set the response already
				hts.doResponse(sendResponse);
			} catch (ex) {
				// need to get a response via proxy
				var proxy = HTTP.createClient(reqInfo.port, reqInfo.hostname);
				var proxyReq = proxy.request(
					reqInfo.method,
					reqInfo.url,
					reqInfo.headers
				);
				proxyReq.socket.on("error",function(err){
					logError(err,'PROXY REQUEST', request.url);
				});
				var throt = reqInfo.throttle || 0;
				var reqQ = new Q.AsynchQueue();
				reqInfo.body.forEach(function(chunk){
					reqQ.push(function(notifier){
						proxyReq.write(chunk);
						setTimeout(function(){
							notifier.notify();
						}, throt);
					});
				});
				reqQ.on('done', function(){
					proxyReq.end();
				});
				reqQ.start();
				proxyReq.on('response', function(proxyResp){
					proxyResp.socket.on("error",function(err){
						logError(err,'PROXY RESPONSE', request.url);
					});
					hts.setResponse(proxyResp, sendResponse);
				});
			}
		});
		reqPhaseQ.start();
	});
}).listen(proxyPort);

// helps to ensure the proxy stays up and running
process.on('uncaughtException',function(err){
	console.log('uncaucht exception: '+err.message);
});

console.log(projectName+' proxy running at http://'+proxyHost+':'+proxyPort);






