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

var beautify = require('js-beautify').js_beautify;

exports.run = function(api) {
	if ((/javascript/i).test(api.getResponseInfo().headers['content-type'])) {
		var js = api.getResponseBody();
		try {
			var beautifulJs = beautify(js, { indent_size: 2 });
			if (js !== beautifulJs && beautifulJs.indexOf('function') != -1) {
				api.setResponseBody(beautifulJs);
			}
			api.notify();
		} catch (ex) {
			api.notify(ex);
		}
	} else {
		api.notify();
	}
};

