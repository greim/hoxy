/*
Written by Greg Reimer
Copyright (c) 2011
http://github.com/greim
*/

/**
Manipulate the request or response body as JSON.

    usage: @json('path/to/your/script.js')
    -or-   @json('my script to eval')

You provide a path to a script which you created and saved somewhere on the same
filesystem as your hoxy instance. This script will execute in an environment
where 'json' is a property of the global object and holds the value of the json
object.

If this plugin runs in the request phase, the script runs against the request
body, and likewise for response. If the body can't be parsed as JSON, this
plugin will fail gracefully.

*/

// declare vars, import libs, etc
var PATH = require('path');
var VM = require('vm');
var FS = require('fs');

// utility to cache script objects
var scriptCache = {};
function getScriptFromPath(path){
	if (!scriptCache[path]){
		var code = FS.readFileSync(path, 'utf8');
		scriptCache[path] = VM.createScript(code);
	}
	return scriptCache[path];
}
function getScriptFromEval(code){
	if (!scriptCache[code]){
		scriptCache[code] = VM.createScript(code);
	}
	return scriptCache[code];
}

exports.run = function(api){
	var reqInf = api.getRequestInfo();
	var respInf = api.getResponseInfo();
	var isJson = true;

	try{
		var jsonObj = JSON.parse(api.getResponseBody());
	} catch (err) {
		isJson = false;
	}
	if (isJson) {
		try{
			var path = api.arg(0);
			path = PATH.resolve('.',path);
			var scriptObj = getScriptFromPath(runMe);
		}catch(err){
			try{
				var scriptObj = getScriptFromEval(api.arg(0));
			}catch(err){
				api.notify();
				throw err;
			}
		}
		scriptObj.runInNewContext({console:console,json:jsonObj});
		api.setResponseBody(JSON.stringify(jsonObj));
		api.notify();
	} else {
		api.notify();
	}
};
