/*
Written by Greg Reimer
Copyright (c) 2011
http://github.com/greim
*/

/**
Manipulate the response body as JSON.

    usage: @json-eval('a scriptlet to eval')

The scriptlet you provide will execute in an
environment where the variable 'json' is available.

Note, if you want a bigger script, use
@json-script() instead.

*/

// declare vars, import libs, etc
var VM = require('vm');

exports.run = function(api){
	var respInf = api.getResponseInfo();
	if (/html/.test(respInf.headers['content-type'])) {
		var code = api.arg(0);
		var json = api.getResponseBody();
		try{
			var script = VM.createScript(code);
			var window = {json:JSON.parse(json)};
			script.runInNewContext(window);
			var newJson = JSON.stringify(window.json);
			api.setResponseBody(newJson);
			api.notify();
		}catch(err){
			api.notify(err);
		}
	} else {
		api.notify();
	}
};
