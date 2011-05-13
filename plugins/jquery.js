/*
Written by Greg Reimer
Copyright (c) 2011
http://github.com/greim
*/

/**
Manipulate the response body as DOM using jQuery.
usage: @jquery('path/to/your/script.js')

NOTES:
 * This plugin is experimental, use at own risk.
 * If path is relative, it resolves to dir hoxy was launched from.
 * Your script will execute in an env similar to browser scripts, with a base window object and a $ var defined.
 * jQuery 1.6.1 is currently used.
*/

var jsdomExists = true;
try { var JSDOM = require('jsdom'); }
catch (err) { jsdomExists = false; }
var PATH = require('path');

var doctypePatt = /(<!doctype[^>]*>)/i;

exports.run = function(api){
	if (!jsdomExists) {
		console.log('The jQuery DOM-manipulation plugin can\'t run because no jsdom library is available.');
		api.notify();
		return;
	}
	var respInf = api.getResponseInfo();
	var ct = respInf.headers['content-type'];
	if (ct && ct.indexOf('html')>-1) {
		var html = api.getResponseBody();
		var script = api.arg(0);
		JSDOM.env({
			html: html,
			scripts: [
				PATH.resolve(__dirname,'./lib/jquery-1.6.1.min.js'),
				PATH.resolve('.',script),
			],
			done: function(errors, window){
				if (errors) {
					var errStrings = errors.map(function(e){return e.toString();});
					var errMess = errStrings.join(', ');
					var ex = new Error(errMess);
					throw ex;
				} else {
					var newHTML = window.document.documentElement.outerHTML;
					var doctype = html.match(doctypePatt);
					doctype = doctype ? doctype[1]+'\r\n' : '';
					newHTML = doctype + newHTML;
					api.setResponseBody(newHTML);
				}
				api.notify();
			},
		});
	} else {
		api.notify();
	}
};
