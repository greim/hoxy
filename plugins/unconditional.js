/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Plugin to avoid http conditional get handshake whereby client informs server it
has cached version, and if server returns "304 not modified" client will use
cached copy. Doesn't completely turn off caching since client may not send
request in first place.

usage: @unconditional

Note: For use in request phase.
Calling in response phase is harmless but ineffective.
*/

exports.run = function(api) {
	delete api.requestInfo.headers['if-modified-since'];
	delete api.requestInfo.headers['if-none-match'];
	api.notify();
};

