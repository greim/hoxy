/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Plugin to test the plugin api.
usage: @test-api()
*/

var ASSERT = require('assert');

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
	var reqInf = api.getRequestInfo();
	var respInf = api.getResponseInfo();
	ASSERT.ok(reqInf, 'expected request info to exist');
	ASSERT.ok(respInf, 'expected response info to exist');
	for (var i=0, s=''; i<10; i++) { s += getRanKB(); }
	api.setResponseBody(s);
	ASSERT.equal(api.getResponseBody(), s, 'expected response bodies to be equal');
	api.setResponseInfo({
		status: 202,
		throttle: 0,
		body: [],
		headers: { 'content-type': 'text/plain; charset=ascii' }
	});
	ASSERT.equal(respInf.status, 202, 'expected status to be 202');
	api.notify();
};

