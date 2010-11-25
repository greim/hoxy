/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to silently redirect the http request on the back end.
(user will NOT see the url change in their location field /
client will NOT receive a 302 response/location: header)

usage: @internal-redirect(url)
*/

var HTTP = require('http');
var URL = require('url');
var HTS = require('../lib/http-transaction-state.js');

exports.run = function(api) {
	var url = api.arg(0);
	var reqUrl = api.requestInfo.url;
	url = URL.resolve(reqUrl, url);
	var pUrl = URL.parse(url);
	var port = parseInt(pUrl.port) || 80;
	var hostname = pUrl.hostname;
	var rootRelUrl = pUrl.pathname;
	if (pUrl.search) rootRelUrl += pUrl.search;

	var client = HTTP.createClient(port, hostname);
	var clientReq = client.request('GET', rootRelUrl, { host: hostname });
	clientReq.end();
	clientReq.on('response', function(resp) {
		var hts = new HTS.HttpTransactionState();
		hts.setResponse(resp, function(respInf){
			api.setResponseInfo(respInf);
			api.notify();
		});
	});
};
