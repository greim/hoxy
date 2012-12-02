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
	var respInf = api.getResponseInfo();
	var ct = respInf.headers['content-type'];
	if (ct && ct.indexOf('html')>-1) {
		var html = api.getResponseBody();
		var contents = api.arg(0);
		var defs = {
			position: 'absolute',
			top: '0',
			left: '0',
			right: '0',
			margin: '0',
			padding: '2px 3px',
			background: '#c00',
			opacity: '.3',
			color: '#fff',
			'font-size': '11px',
			'font-weight': 'normal',
			'font-family': 'helvetica,arial,sans-serif',
			'text-align': 'left',
			'z-index': '99999999999'
		};
		var styleOverride = api.arg(1);
		if (typeof styleOverride == "string"){
			var orList = styleOverride.split(';');
			for (var i=0;i<orList.length;i++){
				var props = orList[i].split(':');
				defs[props[0]] = props[1];
			}
		}
		var styleString = "";
		for (var q in defs){
			styleString += q+':'+defs[q]+';'
		}
		var append = api.arg(2) || false;
		try {
			var banner = '<div style="'+styleString+'">'+contents+'</div>';
			if (append) {
				html=html.replace(/<\/body([^>]*)>/, '</body$1>'+banner);
			} else {
				html=html.replace(/<body([^>]*)>/, '<body$1>'+banner);
			}
			api.setResponseBody(html);
		} catch (ex) {
			console.log("banner error: "+ex.message);
		}
	}
	api.notify();
};
