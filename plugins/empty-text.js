/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to return an empty text/plain response.
usage: @empty-text
*/

exports.run = function(api) {
	api.setResponseInfo({
		statusCode: 200,
		body: [],
		headers: {
			'content-type': 'text/plain; charset=ASCII',
		}
	});
	api.notify();
};
