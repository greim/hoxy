/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Plugin to introduce an artificial delay in the http transaction.
usage: @wait(milliseconds)
*/

exports.run = function(api) {
	var ms = api.arg(0);
	setTimeout(function(){
		api.notify();
	}, ms);
};
