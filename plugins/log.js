/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to output an informative log of a request [and response].
TODO: json isn't nicely readable, implement.

usage: @log
*/

exports.run = function(api) {
	if (api.requestInfo) { console.log(JSON.stringify(api.requestInfo)); }
	if (api.responseInfo) { console.log(JSON.stringify(api.responseInfo)); }
	api.notify();
};
