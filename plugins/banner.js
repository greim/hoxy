/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Adds a banner to the top of an html page showing a message.
usage: @banner('hey, this is a banner!')
*/

exports.run = function(api){
	var ct = api.responseInfo.headers['content-type'];
	if (ct && ct.indexOf('html')>-1) {
		var html = api.getResponseBody();
		var contents = api.arg(0);
		try {
			var banner = '<div style="position:absolute;top:0;left:0;right:0;margin:0;padding:2px 3px;background:#c00;opacity:.3;color:#fff;font-size:11px;font-weight:normal;font-family:helvetica,arial,sans-serif;text-align:left;z-index:99999999999">'+contents+'</div>';
			html=html.replace(/<body([^>]*)>/, '<html$1>'+banner);
			api.setResponseBody(html);
		} catch (ex) {
			console.log("banner error: "+ex.message);
		}
	}
	api.notify();
};
