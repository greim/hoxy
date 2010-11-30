/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
Special thanks to folks at http://jsbeautifier.org/
*/

/**
Plugin to beautify minified or otherwise hard-to-debug JS.
usage: @js-beautify
*/

exports.run = function(api) {
	var ct = api.getResponseInfo().headers['content-type'];
	if (ct && ct.indexOf('javascript')>-1) {
		var js = api.getResponseBody();
		try {
			var beautify = require('./lib/js-beautify.js').js_beautify;
			var beautifulJs = beautify(js);
			api.setResponseBody(beautifulJs);
		} catch (ex) {
			console.log("js-beautify error: "+ex.message);
		}
	}
	api.notify();
};

