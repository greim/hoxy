/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

var URL = require('url');

var hostPatt = /^([a-z0-9\-]+(\.[a-z0-9\-]+)*)(:(\d+))?$/i;

exports.RequestInfo = function(content){

	var data = {
		throttle: null,
		method: null,
		url: null,
		headers: null,
		hostname: null,
		port: null,
		body: null,
	};

	var inf = {

		reset: function(content){
			Object.keys(data).forEach(function(key){
				var cntVal = content[key];
				if (cntVal === undefined || cntVal === null) {
					throw new Error('request info content missing property "'+key+'"');
				}
				inf[key] = cntVal;
			});
		},

		get throttle(){ return data.throttle; },
		set throttle(val){
			var newThr = parseInt(val);
			if (isNaN(newThr) || newThr < 0) {
				throw new Error('invalid value for throttle: '+val);
			}
			data.throttle = newThr;
		},

		get method(){ return data.method; },
		set method(val){
			if (!val) { throw new Error('cannot set method to empty value'); }
			data.method = val.toUpperCase();
		},

		get url(){ return data.url; },
		set url(val){
			data.url = val.toString();
		},

		get headers(){ return data.headers; },
		set headers(val){
			if (!val) { throw new Error('cannot set headers to empty value'); }
			data.headers = val;
		},

		get hostname(){ return data.hostname; },
		set hostname(val){
			if (!val) { throw new Error('cannot set hostname to empty value'); }
			data.hostname = val.toString();
		},

		get host(){
			return data.hostname + (function(){
				var p=data.port;
				if(p!=80){return ':'+p;}
				else{return '';}
			})();
		},
		set host(val){
			if (!val) { throw new Error('cannot set host to empty value'); }
			var m = val.match(hostPatt);
			if (!m) { throw new Error('invalid hostname'); }
			data.hostname = m[1];
			data.port = parseInt(m[4]) || 80;
		},

		get port(){ return data.port; },
		set port(val){
			var newPort = parseInt(val);
			if (isNaN(newPort) || newPort < 1) {
				throw new Error('invalid value for port: '+val);
			}
			data.port = newPort;
		},

		get body(){ return data.body; },
		set body(val){
			if (!val) { throw new Error('cannot set body to empty value'); }
			data.body = val;
		},

		get absUrl(){
			var pt=(data.port==80)?'':':'+data.port;
			return 'http://'+data.hostname+pt+data.url;
		},
		set absUrl(aurl){
			var u = URL.parse(aurl);
			if (!u.hostname) {
				throw new Error('"'+aurl+'" missing host name');
			}
			data.hostname = u.hostname;
			data.port = u.port || 80;
			data.url = (u.pathname || '') + (u.search || '');
		},

	};

	inf.reset(content);

	return inf;

};

exports.ResponseInfo = function(content){

	var data = {
		throttle: null,
		headers: null,
		body: null,
		statusCode: null,
	};

	var inf = {

		reset: function(content){
			Object.keys(data).forEach(function(key){
				var cntVal = content[key];
				if (cntVal === undefined || cntVal === null) {
					throw new Error('response info content missing property "'+key+'"');
				}
				inf[key] = cntVal;
			});
		},

		get throttle(){ return data.throttle; },
		set throttle(val){
			var newThr = parseInt(val);
			if (isNaN(newThr) || newThr < 0) {
				throw new Error('invalid value for throttle: '+val);
			}
			data.throttle = newThr;
		},

		get statusCode(){ return data.statusCode; },
		set statusCode(val){
			var newStat = parseInt(val);
			if (isNaN(newStat) || newStat < 1) {
				throw new Error('invalid value for status code: '+val);
			}
			data.statusCode = newStat;
		},

		get headers(){ return data.headers; },
		set headers(val){
			if (!val) { throw new Error('cannot set headers to empty value'); }
			data.headers = val;
		},

		get body(){ return data.body; },
		set body(val){
			if (!val) { throw new Error('cannot set body to empty value'); }
			data.body = val;
		},
	}

	inf.reset(content);

	return inf;

};
