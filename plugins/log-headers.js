/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

exports.run = function(api){
	var qinf = api.getRequestInfo();
	var sinf = api.getResponseInfo();

	console.log(qinf.method + ' ' + qinf.absUrl);
	Object.keys(qinf.headers).forEach(function(headerName){
		console.log(headerName+': '+qinf.headers[headerName]);
	});

	if (sinf) {
		console.log('------------------------------------');
		console.log(sinf.statusCode);
		Object.keys(sinf.headers).forEach(function(headerName){
			console.log(headerName+': '+sinf.headers[headerName]);
		});
	}

	console.log('\n####################################\n');

	api.notify();
};
