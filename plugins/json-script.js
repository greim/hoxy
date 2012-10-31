/*
Written by Greg Reimer
Copyright (c) 2011
http://github.com/greim
*/

/**

Manipulate the response body as JSON.

    usage: @json-script('path/to/your/script.js')

You provide a path to a script which will execute
in an environment where the variable 'json' is available.

*/

// declare vars, import libs, etc
var PATH = require('path');
var VM = require('vm');
var FS = require('fs');
var await = require('await').await;

function getScript(path){
	return await('code')
	.run(function(p){
		var rpath = PATH.resolve(process.cwd(), path);
		FS.readFile(rpath, 'utf8', p.nodify('code'));
	});
}

exports.run = function(api){
	var respInf = api.getResponseInfo();
	if (/html/.test(respInf.headers['content-type'])) {
		var path = api.arg(0);
		getScript(path)
		.onkeep(function(got){
			var json = api.getResponseBody();
			try{
				var script = VM.createScript(got.code);
				var window = {json:JSON.parse(json)};
				script.runInNewContext(window);
				var newJson = JSON.stringify(window.json);
				api.setResponseBody(newJson);
				api.notify();
			}catch(err){
				api.notify(err);
			}
		})
		.onfail(function(why, err){
			api.notify(err || new Error(why));
		});
	} else {
		api.notify();
	}
};
