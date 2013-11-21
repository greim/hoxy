/*
Written by Greg Reimer
Copyright (c) 2011
http://github.com/greim
*/

/**
Manipulate the response body as DOM using
cheerio, which is similar to jquery.

    usage: @cheerio-eval('a scriptlet to eval')

The scriptlet you provide will execute in an
environment where $ is available.

Note, if you want a bigger script, use
@cheerio-script() instead.

*/

// declare vars, import libs, etc
var CHEERIO = require('cheerio');
var VM = require('vm');

exports.run = function(api){
	var respInf = api.getResponseInfo();
	if (/html/.test(respInf.headers['content-type'])) {
		var code = api.arg(0),
		    html = api.getResponseBody(),
		    opts = {xmlMode:!!api.arg(1), ignoreWhitespace:!!api.arg(2)};
		try{
			var script = VM.createScript(code);
			var window = {$:CHEERIO.load(html, opts)};
			script.runInNewContext(window);
			var newHTML = window.$.html(null, opts);
			api.setResponseBody(newHTML);
			api.notify();
		}catch(err){
			api.notify(err);
		}
	} else {
		api.notify();
	}
};
