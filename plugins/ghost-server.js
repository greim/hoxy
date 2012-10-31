/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Replace response from remote server by static file service out of a dir local to
hoxy, but only when a match is found. Otherwise serve response from remote
server as normal.

usage: @ghost-server(htdocs[, indexFile])

See if request URL path exists under htdocs. If found, serve that file instead
of one on remote server. If not found, serves file on the remote server as
normal. If plugin is running in request phase, a match will pre-empt request to
server. If in response phase, a match merely replaces response body, but will
use remote server's response headers if status == 200.

This plugin is hostname-agnostic. Unless the calling rule is scoped to a
specific host, /path/to/htdocs/foo.html will be served for both
domain1.com/foo.html and domain2.com/foo.html

Note: By default, ghost-server will treat 'path/' as 'path/index.html' when
looking for the file locally. If you supply a second argument, ghost-server will
use that instead of 'index.html', for example: @ghost-server('/some/path','home.php')
*/

var PATH = require('path');
var URL = require('url');
var FS = require('fs');

exports.run = function(api){
	var htdocs = api.arg(0);
	var indexFile = api.arg(1) || 'index.html';
	var qi = api.getRequestInfo();
	var si = api.getResponseInfo();
	var pUrl = URL.parse(qi.url);

	FS.stat(htdocs, function(err, hstats){
		if (err) {
			// docroot doesn't exist or we can't read it
			api.notify(err);
		} else if (!hstats.isDirectory()) {
			// docroot is not a directory
			api.notify(new Error(htdocs+' is not a directory'));
		} else {
			var fullPath = PATH.normalize(htdocs + pUrl.pathname);
			if (fullPath.indexOf(htdocs) !== 0) {
				// theoretically should never happen
				api.notify(new Error('bad path: '+htdocs+' => '+fullPath));
			} else {
				if (fullPath.charAt(fullPath.length-1)==='/'){
					fullPath += indexFile;
				}
				FS.stat(fullPath, function(err, stats){
					if (err || stats.isDirectory()) {
						// file to be ghost served doesn't exist or is a directory
						api.notify();
					} else {
						// do ghost service w/ conditional GET
						var etag = '"'+stats.mtime.getTime()+'"';
						var m = qi.headers['if-none-match'];
						var send304 = m === etag;
						if (!m) {
							try{
								m = new Date(qi.headers['if-modified-since']);
								send304 = m.getTime() < stats.mtime.getTime();
							} catch(err) {
								api.notify(err);
							}
						}
						if (send304) {
							api.setResponseInfo({
								statusCode:304,
								throttle:0,
								headers:{
									'server':'hoxy-ghost-server',
									'date':(new Date()).toUTCString(),
									'content-length':0,
									'last-modified':stats.mtime.toUTCString(),
									'etag':etag,
								},
								body:[],
							});
							api.notify();
						} else {
							FS.readFile(fullPath, function(err, data){
								if (!err) {
									if (si && si.statusCode === 200) {
										si.body = [data];
									} else {
										api.setResponseInfo({
											statusCode:200,
											throttle:0,
											headers:{
												'server':'hoxy-ghost-server',
												'date':(new Date()).toUTCString(),
												'last-modified':stats.mtime.toUTCString(),
												'etag':etag,
												'content-type':getContentType(
													fullPath,
													qi.headers.accept
												),
												'content-length':data.length,
											},
											body:[data],
										});
									}
								}
								api.notify();
							});
						}
					}
				});
			}
		}
	});
};

// todo: use an actual mime types lib
var ctypes = {
	'.html':'text/html',
	'.shtml':'text/html',
	'.htm':'text/html',
	'.css':'text/css',
	'.js':'text/javascript',
	'.gif':'image/gif',
	'.png':'image/png',
	'.jpg':'image/jpeg',
	'.jpeg':'image/jpeg',
	'.xml':'application/xml',
	'.xsl':'application/xml',
};
function isText(ctype) {
	return ctype.indexOf('text') > -1
		|| ctype.indexOf('xml') > -1;
}
function getContentType(path, accept){
	accept = accept || 'text/plain';
	accept = accept.split(',')[0];
	var ext = PATH.extname(path).toLowerCase() || accept;
	var ctype = ctypes[ext];
	if(isText(ctype)){ ctype += '; charset=utf-8'; }
	return ctype;
}
