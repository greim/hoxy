/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

// #############################################################################
// imports

var URL = require('url');

// #############################################################################
// subroutines

// converts "foo%20bar=baz&this=that" to {'foo bar':'baz','this':'that'}
function strToObj(s, sep) {
	var o = {};
	s.split(sep).forEach(function(frag){
		var ioe = frag.indexOf('=');
		if (ioe > -1) {
			var name = decodeURIComponent(frag.substring(0,ioe));
			var val = decodeURIComponent(frag.substring(ioe+1));
			o[name] = val;
		}
	});
	return o;
}

// converts {'foo bar':'baz','this':'that'} to "foo%20bar=baz&this=that"
function objToStr(o, sep) {
	var frags = [];
	Object.keys(o).forEach(function(name){
		var frag = encodeURIComponent(name);
		frag += '=';
		if (o[name] === null || o[name] === undefined) { o[name] = ''; }
		frag += encodeURIComponent(o[name]);
		frags.push(frag);
	});
	return frags.join(sep);
}

function chunkify(str, amt){
	amt = amt || 1024;
	var chunks = [];
	for (var i=0; i < str.length; i += amt) {
		var to = i + amt;
		if (to > str.length) { to = str.length; }
		chunks.push(new Buffer(str.substring(i, to)));
	}
	return chunks;
}

// end subroutines
// #############################################################################
// schema

// getMapper() on an action schema object returns a function which accepts a
// value and returns a value. the mapper function may use local vars of its
// parent function. all mappers must gracefully handle being passed null or
// undefined.

var actionSchema = {
	'clear':{
		argSpec:[],
		getMapper:function(){ return function(){ return undefined; }; },
		description:'Context determines if the thing being cleared is deleted, set to an empty string, or if an error is thrown. Use common sense.',
	},
	'set-to':{
		argSpec:['string'],
		getMapper:function(newVal){ return function(){ return newVal; }; },
		description:'Assigns a new value to something, overwriting the old value.',
	},
	'replace':{
		argSpec:['stringOrRegex','string'],
		getMapper:function(str, rplc){
			return function(cur){
				if (cur === null || cur === undefined) { return cur; }
				return cur.replace(str, rplc);
			};
		},
		description:'Replaces all instances of the first arg by the second arg. If the first arg is a regex, match refs in the second arg will be expanded.',
	},
	'prepend':{
		argSpec:['string'],
		getMapper:function(str){
			return function(cur){
				if (cur === null || cur === undefined) { cur = ''; }
				return str + cur;
			};
		},
		description:'Prepends the given string to the existing value.',
	},
	'append':{
		argSpec:['string'],
		getMapper:function(str){
			return function(cur){
				if (cur === null || cur === undefined) { cur = ''; }
				return cur + str;
			};
		},
		description:'Appends the given string to the existing value.',
	},
};

exports.getActionValidator = function(action) {
	if (!actionSchema[action]) { return false; }
	return {
		argCountIsInRange: function(count){
			return count === actionSchema[action].argSpec.length;
		},
	};
};

// a thing schema object knows how to get or mutate some aspect of an http
// conversation. it knows how many keys it needs in order to do so, e.g. it
// needs zero keys to get the hostname, but one key to get a header, as in
// headers[key]. it also knows during which phases of the http conversation that
// piece of data is available. for mutation, it passes the bit of data in
// question to a mapping function, which returns a value which is used to
// overwrite the old value. by convention, if the mapper returns undefined it's
// considered a delete command.

var thingSchema = {
	'hostname':{
		keys:0,
		get:function(reqi, respi){ return reqi.hostname; },
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.hostname);
			if (!val) { throw new Error("can't delete hostname"); }
			else { reqi.hostname = val; }
		},
		availability:['request','response'],
		description:'Hostname of destination server to which request is being made. Should be identical to the value of the "host" request header.',
	},
	'port':{
		keys:0,
		get:function(reqi, respi){ return reqi.port; },
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.port);
			if (!val) { throw new Error("can't delete port"); }
			else { reqi.port = val; }
		},
		availability:['request','response'],
		description:'Port on destination server on which to connect.',
	},
	'url':{
		keys:0,
		get:function(reqi, respi){ return reqi.url; },
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.url);
			if (!val) { reqi.url = ''; }
			else { reqi.url = val; }
		},
		availability:['request','response'],
		description:'Root-relative URL of the resource being requested.',
	},
	'filename':{
		keys:0,
		get:function(reqi, respi){
			var pUrl = URL.parse(reqi.url);
			var slashSep = pUrl.pathname.split('/');
			if (!slashSep.length) { return ''; }
			return slashSep.pop();
		},
		map:function(reqi, respi, mapper){
			var slashSep = pUrl.pathname.split('/');
			if (!slashSep.length) { slashSep.push(''); }
			slashSep.push(mapper(slashSep.pop()) || '');
			pUrl.pathname = slashSep.join('/');
			reqi.url = URL.format(pUrl);
		},
		availability:['request','response'],
		description:'By convention, any non-slash characters at the end of the URL path.',
	},
	'ext':{
		keys:0,
		get:function(reqi, respi){
			var pUrl = URL.parse(reqi.url);
			var slashSep = pUrl.pathname.split('/');
			if (!slashSep.length) { slashSep.push(''); }
			var dotSep = slashSep.pop().split('.');
			if (!dotSep.length) { return ''; }
			return dotSep.pop();
		},
		map:function(reqi, respi, mapper){
			var pUrl = URL.parse(reqi.url);
			var slashSep = pUrl.pathname.split('/');
			if (!slashSep.length) { slashSep.push(''); }
			var dotSep = slashSep.pop().split('.');
			if (dotSep.length < 2) { dotSep.push(''); }
			var oldExt = dotSep.pop();
			var newExt = mapper(oldExt);
			if (newExt) { dotSep.push(newExt); }
			var fn = dotSep.join('.');
			slashSep.push(fn);
			pUrl.pathname = slashSep.join('/');
			reqi.url = URL.format(pUrl);
		},
		availability:['request','response'],
		description:'The filename extension matching the convention `file.ext`',
	},
	'request-headers':{
		keys:1,
		get:function(reqi, respi, name){ return reqi.headers[name]; },
		map:function(reqi, respi, mapper, name){
			var val = mapper(reqi.headers[name]);
			if (!val) { delete reqi.headers[name]; }
			else { reqi.headers[name] = val; }
		},
		availability:['request','response'],
		description:'A dictionary object containing request header names and their values.',
	},
	'referer':{
		keys:0,
		get:function(reqi, respi){
			return reqi.headers.referer;
		},
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.headers.referer);
			if (!val) { delete reqi.headers.referer; }
			else { reqi.headers.referer = val; }
		},
		availability:['request','response'],
		description:'Alias for $request-headers["referer"].',
	},
	'user-agent':{
		keys:0,
		get:function(reqi, respi){
			return reqi.headers['user-agent'];
		},
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.headers['user-agent']);
			if (!val) { delete reqi.headers['user-agent']; }
			else { reqi.headers['user-agent'] = val; }
		},
		availability:['request','response'],
		description:'Alias for $request-headers["user-agent"].',
	},
	'origin':{
		keys:0,
		get:function(reqi, respi){
			return reqi.headers.origin;
		},
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.headers.origin);
			if (!val) { delete reqi.headers.origin; }
			else { reqi.headers.origin = val; }
		},
		availability:['request','response'],
		description:'Alias for $request-headers["origin"].',
	},
	'cookies':{
		keys:1,
		get:function(reqi, respi, name){
			var cs = reqi.headers.cookie || '';
			var co = strToObj(cs, /\s*;\s*/);
			return co[name];
		},
		map:function(reqi, respi, mapper, name){
			var cs = reqi.headers.cookie || '';
			var co = strToObj(cs, /\s*;\s*/);
			var val = mapper(co[name]);
			if (val === undefined) { delete co[name]; }
			else { co[name] = val; }
			var newcs = objToStr(co, '; ');
			if (!newcs) { delete reqi.headers.cookie; }
			else { reqi.headers.cookie = newcs; }
		},
		availability:['request','response'],
		description:'A dictionary object containing cookie names and their values. Names and values are URL-decoded.',
	},
	'url-params':{
		keys:1,
		get:function(reqi, respi, name){
			var pUrl = URL.parse(reqi.url);
			var qs = pUrl.query || '';
			var qo = strToObj(qs, '&');
			return qo[name];
		},
		map:function(reqi, respi, mapper, name){
			var pUrl = URL.parse(reqi.url);
			var qs = pUrl.query || '';
			var qo = strToObj(qs, '&');
			var val = mapper(qo[name]);
			if (val === undefined) { delete qo[name]; }
			else { qo[name] = val; }
			var newqs = objToStr(qo, '&');
			reqi.url = pUrl.pathname;
			if (newqs) { reqi.url += '?' + newqs; }
		},
		availability:['request','response'],
		description:'A dictionary object containing URL param names and their values. Names and values are URL-decoded.',
	},
	'body-params':{
		keys:1,
		get:function(reqi, respi, name){
			var qs = '';
			reqi.body.forEach(function(chunk){ qs += chunk.toString(); });
			var qo = strToObj(qs, '&');
			return qo[name];
		},
		map:function(reqi, respi, mapper, name){
			var qs = '';
			reqi.body.forEach(function(chunk){ qs += chunk.toString(); });
			var qo = strToObj(qs, '&');
			var val = mapper(qo[name]);
			if (val === undefined) { delete qo[name]; }
			else { qo[name] = val; }
			var newqs = objToStr(qo, '&');
			reqi.body = chunkify(newqs);
			reqi.headers['content-length'] = Buffer.byteLength(val);
		},
		availability:['request','response'],
		description:'A dictionary object containing request body names and their values. Typical with POSTs. Names and values are URL-decoded.',
	},
	'method':{
		keys:0,
		get:function(reqi, respi){ return reqi.method; },
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.method);
			if (!val) { throw new Error("can't delete method"); }
			else { reqi.method = val; }
		},
		availability:['request','response'],
		description:'Method of the request being made to the destination server. Uppercase by convention, as in GET.',
	},
	'request-body':{
		keys:0,
		get:function(reqi, respi){
			var body = '';
			reqi.body.forEach(function(chunk){
				body += chunk.toString('utf8');
			});
			return body;
		},
		map:function(reqi, respi, mapper){
			var body = this.get(reqi, respi);
			var val = mapper(body);
			reqi.body = val ? chunkify(val) : [];
			reqi.headers['content-length'] = val ? Buffer.byteLength(val) : 0;
		},
		availability:['request','response'],
		description:'Request body in its entirety, represented as a string. Beware binary data.',
	},
	'response-headers':{
		keys:1,
		get:function(reqi, respi, name){ return respi.headers[name]; },
		map:function(reqi, respi, mapper, name){
			var val = mapper(respi.headers[name]);
			if (!val) { delete respi.headers[name]; }
			else { respi.headers[name] = val; }
		},
		availability:['response'],
		description:'A dictionary object containing response header names and their values.',
	},
	'content-type':{
		keys:0,
		get:function(reqi, respi){
			var ct = respi.headers['content-type'];
			if (!ct) { return ct; }
			return ct.split(/\s*;\s*/)[0];
		},
		map:function(reqi, respi, mapper){
			var oldVal = this.get(reqi, respi);
			var newVal = mapper(oldVal);
			if (!newVal) {
				delete respi.headers['content-type'];
			} else {
				var ct = respi.headers['content-type'];
				if (!ct) { respi.headers['content-type'] = newVal; }
				else {
					ct = ct.split(/\s*;\s*/);
					ct[0] = newVal;
					respi.headers['content-type'] = ct.join('; ');
				}
			}
		},
		availability:['response'],
		description:'Just the mime type portion of the "content-type" response-header.',
	},
	'charset':{
		keys:0,
		get:function(reqi, respi){
			var ct = respi.headers['content-type'];
			if (!ct) { return undefined; }
			ct = ct.split(/\s*;\s*charset\s*=\s*/);
			if (ct.length < 2) { return undefined; }
			return ct[1];
		},
		map:function(reqi, respi, mapper){
			var oldVal = this.get(reqi, respi);
			var newVal = mapper(oldVal);
			var ct = respi.headers['content-type'];
			if (ct) {
				ct = ct.split(/\s*;\s*charset\s*=\s*/);
				if (newVal) { ct[1] = newVal; }
				else { ct.length = 1; }
				respi.headers['content-type'] = ct.join('; charset=');
			}
		},
		availability:['response'],
		description:'Just the charset portion of the "content-type" response-header.',
	},
	'status':{
		keys:0,
		get:function(reqi, respi){ return respi.status; },
		map:function(reqi, respi, mapper){
			var val = mapper(respi.status);
			if (!val) { throw new Error("can't delete status"); }
			else { respi.status = val; }
		},
		availability:['response'],
		description:'Status code of the server response.',
	},
	'response-body':{
		keys:0,
		get:function(reqi, respi){
			var body = '';
			respi.body.forEach(function(chunk){
				body += chunk.toString('utf8');
			});
			return body;
		},
		map:function(reqi, respi, mapper){
			var body = this.get(reqi, respi);
			var val = mapper(body);
			respi.body = val ? chunkify(val, 2048) : [];
			respi.headers['content-length'] = val ? Buffer.byteLength(val) : 0;
		},
		availability:['response'],
		description:'Response body in its entirety, represented as a string. Beware binary data.',
	},
};

exports.getThingValidator = function(thing) {
	if (!thingSchema[thing]) { return false; }
	return {
		keyCountIs: function(count){
			return count === thingSchema[thing].keys;
		},
		availableIn: function(phase){
			return thingSchema[thing].availability.indexOf(phase) > -1;
		},
	};
};

// for documentation purposes

exports.printDocs = function(){
	var items = [];
	for (var p in actionSchema) {
		var action = actionSchema[p];
		items.push('* `'+p+'('+action.argSpec.join(', ')+')` - '+action.description);
	}
	for (var p in thingSchema) {
		var thing = thingSchema[p];
		var result = '* `$'+p;
		if (thing.keys) {
			var i=thing.keys;
			result += '[';
			while(i--){
				result+='key';
				if (i) result += ',';
			}
			result += ']';
		}
		result += '` - '+thing.description;
		items.push(result);
	}
	console.log(items.join('\n'));
};

// end schema
// #############################################################################
// HttpTransactionState

// represents the ongoing state of an HTTP transaction
exports.HttpTransactionState = function(){
	var htState = this,
		reqInf,
		respInf;

	// pass this method an http request object and it will set all the appropriate variables
	htState.setRequest = function(req, callback){
		// being a proxy, should be an abs url
		var pUrl = URL.parse(req.url, true);
		var url = pUrl.pathname;
		if (pUrl.search) { url += pUrl.search; }
		var hn = req.headers.host || pUrl.hostname;
		hn = hn.replace(/:.*/,'');
		reqInf = {
			method: req.method,
			headers: req.headers,
			url: url,
			hostname: hn,
			port: parseInt(pUrl.port) || 80,
			protocol: pUrl.protocol,
			body: [],
			throttle: 0,
		};
		req.on('data', function(chunk){ reqInf.body.push(chunk); });
		req.on('end', function(){
			callback(reqInf);
		});
	};

	// pass this method an http response object and it will set all the appropriate variables
	htState.setResponse = function(resp, callback){
		respInf = {
			headers: resp.headers,
			status: resp.statusCode,
			body: [],
			throttle: 0,
		};
		resp.on('data', function(chunk){ respInf.body.push(chunk); });
		resp.on('end', function(chunk){
			callback(respInf);
		});
	};

	htState.doResponse = function(callback){
		if (!respInf) { throw new Error('response not set'); }
		callback(respInf);
	};

	// manipulate some aspect of the state
	htState.morph = function(action, actionArgs, thing, thingArgs){
		var aSch = actionSchema[action];
		var tSch = thingSchema[thing];
		var mapper = aSch.getMapper.apply(aSch, actionArgs);
		var args = [reqInf, respInf, mapper];
		//thingArgs.forEach(function(arg){ args.push(arg); });
		args.push.apply(args, thingArgs);
		tSch.map.apply(tSch, args);
	};

	// retrieve some aspect of the state
	htState.get = function(thing, thingArgs){
		// "thing" is a string
		var args = [reqInf, respInf];
		//thingArgs.forEach(function(arg){ args.push(arg); });
		args.push.apply(args, thingArgs);
		return thingSchema[thing].get.apply(thingSchema[thing], args);
	};

	// run a plugin against the state
	htState.runPlugin = function(name, args, notifier){
		var apiObj = {
			arg: function(i) { return args[i]; },
			setRequestInfo: function(newInfo){
				reqInf = reqInf || {};
				for (var p in reqInf) {
					if (reqInf.hasOwnProperty(p)) {
						delete reqInf[p];
					}
				}
				for (var p in newInfo) {
					if (newInfo.hasOwnProperty(p)) {
						reqInf[p] = newInfo[p];
					}
				}
			},
			setResponseInfo: function(newInfo){
				respInf = respInf || {};
				for (var p in respInf) {
					if (respInf.hasOwnProperty(p)) {
						delete respInf[p];
					}
				}
				for (var p in newInfo) {
					if (newInfo.hasOwnProperty(p)) {
						respInf[p] = newInfo[p];
					}
				}
			},
			setResponseBody:function(body){
				htState.morph('set-to', [body], 'response-body', []);
			},
			setRequestBody:function(body){
				htState.morph('set-to', [body], 'request-body', []);
			},
			getResponseBody:function(){
				return htState.get('response-body', []);
			},
			getRequestBody:function(){
				return htState.get('request-body', []);
			},
			getRequestInfo:function(){
				return reqInf;
			},
			getResponseInfo:function(){
				return respInf;
			},
			requestInfo: reqInf,
			responseInfo: respInf,
			state: htState,
			notify: function(){ notifier.notify(); },
		};
		var filename = '../plugins/' + name + '.js';
		var plugin = require(filename);
		plugin.run.call(plugin, apiObj);
	};
};

