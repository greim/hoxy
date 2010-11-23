/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
Special thanks to folks at http://jsbeautifier.org/
*/

/*
Plugin to beautify minified or otherwise hard-to-debug HTML.
usage: @html-beautify
*/

exports.run = function(api) {
	var ct = api.responseInfo.headers['content-type'];
	if (ct && ct.indexOf('html')>-1) {
		var html = api.getResponseBody();
		try {
			var beautify = require('./lib/html-beautify.js').style_html;
			var beautifulHtml = beautify(html);
			api.setResponseBody(beautifulHtml);
		} catch (ex) {
			console.log("html-beautify error: "+ex.message);
		}
	}
	api.notify();
};

