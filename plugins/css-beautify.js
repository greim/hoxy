/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to beautify minified or otherwise hard-to-debug CSS.
usage: @css-beautify
*/

var PrettyCSS = require('PrettyCSS');

exports.run = function(api) {
	var ct = api.getResponseInfo().headers['content-type'];
	if (ct && ct.indexOf('text/css')===0) {
		var css = api.getResponseBody();
		try {
			var beautifulCss = PrettyCSS.parse(css).toString();
			api.setResponseBody(beautifulCss);
			api.notify();
		} catch (ex) {
			api.notify(ex);
		}
	} else {
		api.notify()
	}
};


