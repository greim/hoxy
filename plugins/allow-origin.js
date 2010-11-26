/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Sets the response header "access-control-allow-origin" to whatever value is found in request header "origin".

usage: @allow-origin()
*/

exports.run = function(api){
	var respInf,
		origin,
		reqInf = api.getRequestInfo();

	if (
		respInf = api.getResponseInfo()
		&& origin = reqInf.headers.origin
	) {
		respInf.headers['access-control-allow-origin'] = origin;
	}
	api.notify();
};

