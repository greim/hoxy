/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/**
Plugin to return a ((very) pseudo)-randomly-generated text/html response.
usage: @dummy-load(sizeOfResponseBodyInKilobytes)
*/

if (!Array.prototype.shuffle) {
    Array.prototype.shuffle = function() {
        var i = this.length;
        if (i==0) { return this; }
        while (--i) {
            var j = Math.floor(Math.random() * (i+1));
            var tempi = this[i];
            var tempj = this[j];
            this[i] = tempj;
            this[j] = tempi;
        }
        return this;
    };
}

var str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~!@#$%^&*()_+=-[]\\|}{;\'":,./?><';
var foo = [];
function getRanKB(){
	if (!foo.length) {
		for (var i=0; i<128; i++) {
			var s = '';
			for (var j=0; j<127; j++) {
				s += str.charAt(Math.floor(Math.random() * str.length));
			}
			s += '\n';
			foo.push(s);
		}
	} else {
		foo.shuffle();
	}
	return foo.slice(0,8).join('');
}

exports.run = function(api) {
	var kb = api.arg(0);
	var body = [];
	for (var i=0; i<kb; i++) {
		body.push(getRanKB());
	}
	api.setResponseInfo({
		status: 200,
		body: body,
		headers: {
			'content-type': 'text/plain; charset=ASCII',
		},
	});
	api.notify();
};
