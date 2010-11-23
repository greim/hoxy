var EVENTS = require('events');
var URL = require('url');

function RequestReader(hReq){

	// since this is a request to a proxy, we expect this to be a full url
	var pUrl = URL.parse(hReq.url, true);

	// informational object containing everything we need to make a request
	var inf = {
		headers: hReq.headers,
		url: pUrl.pathname + pUrl.search,
		hostname: pUrl.hostname,
		port: pUrl.port || 80,
		protocol: pUrl.protocol,
	};

	// overwrite various aspects of the request info
	inf.set = function(prop, val){
		var del = val === undefined; // means we should delete it completely
		if (val === null) val = ''; // don't want to set things to "null"
		var name = arguments[2]; // not always used
		var pUrl = URL.parse(inf.url);

		if (prop === 'cookies') {
			var cs = inf.headers.cookie || '';
			var co = strToObj(cs, /\s*;\s*/);
			if (del) { delete co[name]; }
			else { co[name] = val; }
			var newcs = objToStr(co, '; ');
			if (newcs) { inf.headers.cookie = newcs; }
			else { delete inf.headers.cookie; }
		} else if (prop === 'query') {
			var qs = pUrl.query || '';
			var qo = strToObj(qs, '&');
			if (del) { delete qo[name]; }
			else { qo[name] = val; }
			var newqs = objToStr(qo, '&');
			inf.url = pUrl.pathname;
			if (newqs) { inf.url += '?' + newqs; }
		} else if (prop === 'headers') {
			if (del) { delete inf.headers[name]; }
			else { inf.headers[name] = val; }
		} else if (prop === 'url') {
			if (del) { delete inf.url; }
			else { inf.url = val; }
		} else if (prop === 'hostname') {
			if (del) { delete inf.hostname; }
			else { inf.hostname = val; }
		} else if (prop === 'port') {
			if (del) { delete inf.port; }
			inf.port = parseInt(val);
		} else if (prop === 'pathname') {
			var p = val || '';
			var q = pUrl.search || '';
			inf.url = p + q;
		} else if (prop === 'protocol') {
			if (del) { delete inf.protocol; }
			else { inf.protocol = val; }
		}
	};

	var reader = new EVENTS.EventEmitter();
	var body = '';
	hReq.setEncoding('utf8');
	hReq.on('data', function(chunk){ body += chunk; });
	hReq.on('end', function(chunk){
		inf.body = body;
		reader.emit('complete', inf);
	});
	return reader;
}

function strToObj(s, patt) {
	var o = {};
	c.split(patt).forEach(function(frag){
		var ioe = frag.indexOf('=');
		if (ioe > -1) {
			var name = decodeURIComponent(frag.substring(0,ioe));
			var val = decodeURIComponent(frag.substring(ioe+1));
			o[name] = val;
		}
	});
	return o;
}

function objToStr(o, sep) {
	var frags = [];
	Object.keys(o).forEach(function(name){
		var frag = encodeURIComponent(name);
		frag += '=';
		if (o[name] === null) { o[name] = ''; }
		frag += encodeURIComponent(o[name]);
		frags.push(frag);
	});
	return frags.join(sep);
}

new RequestReader(httpRequest).on('complete', function(reqInfo){
	// reqInfo.body, reqInfo.headers, etc
	rules.forEach(function(rule){
		rule.filter(function(rule){
			return rule.phase === 'request';
		}).execute(reqInfo, null);
	});
	if (!reqInfo.overridden) {
		// create client based on info
		new ResponseReader(httpResponse).on('complete', function(respInfo){
			rule.filter(function(rule){
				return rule.phase === 'response';
			}).execute(reqInfo, respInfo);
			if (!respInfo.overridden) {
				// write response
			}
		});
	}
});
