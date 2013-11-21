/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

// #############################################################################
// imports

var URL = require('url');
var opts = require('tav');

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
	'log':{
		argSpec:[],
		getMapper:function(str){
			return function(cur){
				console.log(cur);
				return cur;
			};
		},
		description:'Prints the value to the console.',
	},
};

exports.pluginPath = function(name) {
  return '../plugins/' + name + '.js'
}

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
		aliases:[],
		description:'Hostname of destination server to which request is being made (doesn\'t include port).',
	},
	'host':{
		keys:0,
		get:function(reqi, respi){ return reqi.host; },
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.host);
			if (!val) { throw new Error("can't delete host"); }
			else { reqi.host = val; }
		},
		availability:['request','response'],
		aliases:[],
		description:'Hostname plus port (`<hostname>:<port>`) of destination server to which request is being made. If port is 80 will just return hostname.',
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
		aliases:[],
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
		aliases:['rurl'],
		description:'Root-relative URL of the resource being requested.',
	},
	'absolute-url':{
		keys:0,
		get:function(reqi, respi){ return reqi.absUrl; },
		map:function(reqi, respi, mapper){
			var val = mapper(reqi.absUrl);
			if (!val) { reqi.absUrl = ''; }
			else { reqi.absUrl = val; }
		},
		availability:['request','response'],
		aliases:['aurl'],
		description:'Absolute URL of the resource being requested.',
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
			var pUrl = URL.parse(reqi.url);
			var slashSep = pUrl.pathname.split('/');
			if (!slashSep.length) { slashSep.push(''); }
			slashSep.push(mapper(slashSep.pop()) || '');
			pUrl.pathname = slashSep.join('/');
			reqi.url = URL.format(pUrl);
		},
		availability:['request','response'],
		aliases:['file'],
		description:'By convention, any non-slash characters at the end of the URL path.',
	},
	'extension':{
		keys:0,
		get:function(reqi, respi){
			var pUrl = URL.parse(reqi.url);
			var slashSep = pUrl.pathname.split('/');
			if (!slashSep.length) { slashSep.push(''); }
			var dotSep = slashSep.pop().split('.');
			if (dotSep.length < 2) { return ''; }
			return dotSep.pop();
		},
		map:function(reqi, respi, mapper){
			var extPatt = /([^\/\.]+)\.([^\/\.]+)$/;
			var pUrl = URL.parse(reqi.url);
			var eMatches = pUrl.pathname.match(extPatt);
			var ext = eMatches ? eMatches[2] : '';
			var newExt = mapper(ext);
			if (eMatches && newExt) {
				pUrl.pathname = pUrl.pathname.replace(extPatt, '$1.'+newExt);
			} else if (newExt) {
				pUrl.pathname += '.'+nexExt;
			} else if (eMatches && !newExt) {
				pUrl.pathname = pUrl.pathname.replace(extPatt, '$1');
			}
			reqi.url = URL.format(pUrl);
		},
		availability:['request','response'],
		aliases:['ext'],
		description:'The filename extension matching the convention `file.ext`',
	},
	'request-headers':{
		keys:1,
		get:function(reqi, respi, name){
			return name == '*' ? reqi.headers : reqi.headers[name];
		},
		map:function(reqi, respi, mapper, name){
			if (name == '*') {
				mapper(reqi.headers);
			} else {
				var val = mapper(reqi.headers[name]);
				if (!val) { delete reqi.headers[name]; }
				else { reqi.headers[name] = val; }
			}
		},
		availability:['request','response'],
		aliases:['qh'],
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
		aliases:['referrer'],
		description:'Shortcut for `$request-headers["referer"]`.',
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
		aliases:['ua'],
		description:'Shortcut for `$request-headers["user-agent"]`.',
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
		aliases:[],
		description:'Shortcut for `$request-headers["origin"]`.',
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
		aliases:['ck'],
		description:'Convenience for mapping into `$request-headers["cookie"]`. A dictionary object containing cookie names and their values. Names and values are URL-decoded.',
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
		aliases:[],
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
		},
		availability:['request','response'],
		aliases:[],
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
		aliases:[],
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
		},
		availability:['request','response'],
		aliases:[],
		description:'Request body in its entirety, represented as a string. Beware binary data.',
	},
	'response-headers':{
		keys:1,
		get:function(reqi, respi, name){
			return name == '*' ? respi.headers : respi.headers[name];
		},
		map:function(reqi, respi, mapper, name){
			if (name == '*') {
				mapper(respi.headers);
			} else {
				var val = mapper(respi.headers[name]);
				if (!val) { delete respi.headers[name]; }
				else { respi.headers[name] = val; }
			}

		},
		availability:['response'],
		aliases:['sh'],
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
		aliases:['mime-type'],
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
		aliases:[],
		description:'Just the charset portion of the "content-type" response-header.',
	},
	'status-code':{
		keys:0,
		get:function(reqi, respi){ return respi.statusCode; },
		map:function(reqi, respi, mapper){
			var val = mapper(respi.statusCode);
			if (!val) { throw new Error("can't delete status code"); }
			else { respi.statusCode = val; }
		},
		availability:['response'],
		aliases:['status'],
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
		},
		availability:['response'],
		aliases:['body'],
		description:'Response body in its entirety, represented as a string. Beware binary data.',
	},
	'hoxy-configuration':{
		keys:1,
		get:function(reqi, respi, key){
			var keys = key.split('.'),
			    opt = opts;
			while ((key = keys.shift()) && !(typeof opts[key] == 'undefined')) {
				opt = opts[key]
			}
			return opt;
		},
		map:function(reqi, respi, mapper, key) {
			var val = mapper(this.get(reqi, respi, key));
			if (!val) { /* // intentionally left blank // delete respi.headers[name]; */ }
			else { /* // intentionally left blank // respi.headers[name] = val; */ }
		},
		availability:['request','response'],
		aliases:['hoxy'],
	}
};

// gen docs from schema
var docs = (function(){
	var items = [];
	for (var p in actionSchema) {
		var action = actionSchema[p];
		items.push('* `'+p+'('+action.argSpec.join(', ')+')` - '+action.description);
	}
	items.push('');
	for (var p in thingSchema) {
		var thing = thingSchema[p];
		var result = '* '
		var key='';
		if (thing.keys) {
			var i=thing.keys;
			key += '[';
			while(i--){
				key+='key';
				if (i) key += ',';
			}
			key += ']';
		}
		result+='`$'+p+key+'`';
		if (thing.aliases.length) {
			result += ' (alias: ';
			result += thing.aliases.map(function(alias){
				return '`$'+alias+key+'`'
			}).join(', ');
			result += ')';
		}
		result += ' - '+thing.description;
		result += ' (availability: '+thing.availability.join(', ')+')';
		items.push(result);
	}
	return items;
})();

// expand aliases
Object.keys(thingSchema).forEach(function(key){
	thingSchema[key].aliases.forEach(function(alias){
		if (thingSchema[alias]) {
			throw new Error(alias+' already exists in thing schema');
		}
		thingSchema[alias] = thingSchema[key];
	});
});

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
	console.log(docs.join('\n'));
};
//exports.printDocs();

// end schema
// #############################################################################
// HttpTransactionState

var INFO = require('./http-info.js');

var pluginRegister = {};

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
		reqInf = new INFO.RequestInfo({
			method: req.method,
			headers: req.headers,
			url: url,
			hostname: hn,
			port: parseInt(pUrl.port) || 80,
			body: [],
			throttle: 0,
		});
		req.on('data', function(chunk){
			reqInf.body.push(chunk);
		});
		req.on('end', function(){
			callback(reqInf);
		});
	};

	// pass this method an http response object and it will set all the appropriate variables
	htState.setResponse = function(resp, callback){
		respInf = new INFO.ResponseInfo({
			headers: resp.headers,
			statusCode: resp.statusCode,
			body: [],
			throttle: 0,
		});
		resp.on('data', function(chunk){
			respInf.body.push(chunk);
		});
		resp.on('end', function(){
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
		args.push.apply(args, thingArgs);
		tSch.map.apply(tSch, args);
	};

	// retrieve some aspect of the state
	htState.get = function(thing, thingArgs){
		// "thing" is a string
		var args = [reqInf, respInf];
		args.push.apply(args, thingArgs);
		return thingSchema[thing].get.apply(thingSchema[thing], args);
	};

	// run a plugin against the state
	htState.runPlugin = function(name, args, notifier){
		var api = {
			arg: function(i) {
				return args[i];
			},
			setRequestInfo: function(newInfo){
				if (reqInf) { reqInf.reset(newInfo); }
				else { reqInf = new INFO.RequestInfo(newInfo); }
			},
			setResponseInfo: function(newInfo){
				if (respInf) { respInf.reset(newInfo); }
				else { respInf = new INFO.ResponseInfo(newInfo); }
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
			getHoxyConfiguration:function(){
				return opts;
			},
			state: htState,
			notify: function(err){
				if (err && err.message) {
					console.error('Error running the "%s" plugin.', name)
					console.error(err.stack)
				}
				notifier.notify();
			},
		};
		var plugin = pluginRegister[name] || null;
		if (plugin === null) {
			try{
				plugin = require('hoxy-' + name);
			}catch(err){
				plugin = null;
			}
			pluginRegister[name] = plugin;
		}
		if (plugin === null) {
			var filename = '../plugins/' + name + '.js';
			try{
				plugin = require(filename);
			}catch(err){
              var filename = exports.pluginPath(name);
              try{
                plugin = require(filename);
              }catch(err){
                notifier.notify();
                throw new Error('failed to load plugin "'+name+'": '+err.message);
              }
			}
			pluginRegister[name] = plugin;
		}
		try{
			plugin.run(api, module.exports);
		}catch(err){
			// WARNING: plugin is always responsible to notify, even if it throws errors
			throw new Error('error running plugin "'+name+'": '+err.message);
		}
	};
};

