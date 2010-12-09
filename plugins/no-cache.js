/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
suppress caching at all costs.
usage: @no-cache
*/

exports.run = function(api) {
	var qi = api.getRequestInfo();
	var si = api.getResponseInfo();
	delete qi.headers['if-modified-since'];
	delete qi.headers['if-none-match'];
	if (si){
		//we're in the response phase
		delete si.headers.expires;
		delete si.headers.etag;
		delete si.headers.pragma;
		delete si.headers['last-modified'];
		si.headers['cache-control']='no-cache, no-store';
	}
api.notify();
};
