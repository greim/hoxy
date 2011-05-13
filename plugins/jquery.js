/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Manipulate the response body as DOM using jQuery.
usage: @jquery('path/to/script.js')
*/

var JSDOM = require('jsdom');
var PATH = require('path');
var doctypePatt = /(<!doctype[^>]*>)/i;

exports.run = function(api){
	var respInf = api.getResponseInfo();
	var ct = respInf.headers['content-type'];
	if (ct && ct.indexOf('html')>-1) {
		var html = api.getResponseBody();
		var script = api.arg(0);
		// TODO: resolve and normalize script path to absolute, using as context the dir from which this node process was launched
		JSDOM.env({
			html: html,
			scripts: ['./lib/jquery-1.6.1.min.js',script],
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
