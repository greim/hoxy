/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to return expiry/cache-control headers.
usage: @expires(days, hours, minutes, seconds)
example: @expires(4,3,2,1) will send expiry headers causing the response to
expire 4 days, 3 hours, two minutes, and one second from the time of the
request.
*/

exports.run = function(api) {

	var days = parseInt(api.arg(0)) || 0;
	var hours = parseInt(api.arg(1)) || 0;
	var minutes = parseInt(api.arg(2)) || 0;
	var seconds = parseInt(api.arg(3)) || 0;

	var secs = 0;

	secs += days    * 60 * 60 * 24;
	secs += hours   * 60 * 60;
	secs += minutes * 60;
	secs += seconds;

	var expires = new Date();
	expires.setTime(expires.getTime() + secs * 1000);

	var ri = api.getResponseInfo();

	if (secs > 0) {
		ri.headers.expires = expires.toUTCString();
		ri.headers['cache-control'] = 'max-age='+secs;
	} else {
		delete ri.headers.expires;
		delete ri.headers['cache-control'];
	}

	api.notify();
};

