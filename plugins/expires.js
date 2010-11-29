/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to return an expires header.
usage: @expires(days, hours, minutes, seconds)
example: @expires(4,3,2,1) will send an expires header causing the response to
expire 4 days, 3 hours, two minutes, and one second from now.
*/

exports.run = function(api) {

	var days = parseInt(api.arg(0)) || 0;
	var hours = parseInt(api.arg(1)) || 0;
	var minutes = parseInt(api.arg(2)) || 0;
	var seconds = parseInt(api.arg(3)) || 0;

	var ms = 0;

	ms += days    * 1000 * 60 * 60 * 24;
	ms += hours   * 1000 * 60 * 60;
	ms += minutes * 1000 * 60;
	ms += seconds * 1000;

	var expires = new Date();
	expires.setTime(expires.getTime() + ms);

	var ri = api.getResponseInfo();

	if (ms > 0) {
		ri.headers.expires = expires.toUTCString();
	} else {
		delete ri.headers.expires;
	}

	api.notify();
};

