/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
Special thanks to folks at http://jsbeautifier.org/
*/

/**
Plugin to beautify minified or otherwise hard-to-debug HTML.
usage: @html-beautify
*/

var HTML = require('html');

exports.run = function(api) {
	var ct = api.getResponseInfo().headers['content-type'];
	if (ct && ct.indexOf('html')>-1) {
		var html = api.getResponseBody();
		try {
			var beautifulHtml = HTML.prettyPrint(html, {indent_size: 2});
			api.setResponseBody(beautifulHtml);
			api.notify();
		} catch (ex) {
			api.notify(ex);
		}
	} else {
		api.notify();
	}
};

