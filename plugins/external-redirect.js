/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Plugin to generate an http 302 redirect to the given url.
(user will see the url change in their location field)
usage: @external-redirect(url)
*/

exports.run = function(api) {
	var url = api.arg(0);
	api.setResponseInfo({
		statusCode: 302,
		body: [],
		headers: {
			location: url,
		}
	});
	api.notify();
};
