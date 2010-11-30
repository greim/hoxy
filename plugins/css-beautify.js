/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to beautify minified or otherwise hard-to-debug CSS.
usage: @css-beautify
*/

exports.run = function(api) {
	var ct = api.getResponseInfo().headers['content-type'];
	if (ct && ct.indexOf('text/css')===0) {
		var css = api.getResponseBody();
		try {
			var beautify = require('./lib/css-beautify.js').css_beautify;
			var beautifulCss = beautify(css);
			api.setResponseBody(beautifulCss);
		} catch (ex) {
			console.log("css-beautify error: "+ex.message);
		}
	}
	api.notify();
};


