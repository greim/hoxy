/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
Special thanks to folks at http://jsbeautifier.org/
*/

/**
Plugin to beautify minified or otherwise hard-to-debug JSON.
usage: @json-beautify
*/

exports.run = function(api) {
	var ct = api.getResponseInfo().headers['content-type'];
	if (ct && ct.indexOf('json')>-1) {
		var json = api.getResponseBody();
		try {
			var beautifulJson = JSON.stringify(JSON.parse(json), null, '  ');
			api.setResponseBody(beautifulJson);
			api.notify();
		} catch (ex) {
			api.notify(ex);
		}
	} else {
		api.notify();
	}
};

