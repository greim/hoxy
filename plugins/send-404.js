/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Sends a 404 not found response.

usage: @send-404()
*/

exports.run = function(api){
	api.setResponseInfo({
		headers: { content-type: 'text/plain; charset=ascii' },
		status: 404,
		body: [],
		throttle: 0,
	});
	api.setResponseBody('not found');
	api.notify();
};
