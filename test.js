/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
To run tests, make sure tool is not already running.
Stand in this dir and run the command:

> node tests.js

*/

require('./main.js');
var HTTP = require('http');
var Rule = require('./lib/rules.js').Rule;
var RDB = require('./lib/rules-db.js');
RDB.setRules([new Rule('request:@test("start")')]);

HTTP.createServer(function(req, resp){
	console.log('received response');
	resp.writeHead(200, {'content-type':'text/plain; charset=ascii'});
	resp.end('');
}).listen(8081);
console.log('created test server');

var cl = HTTP.createClient(8080, 'localhost');
var req = cl.request('get', 'http://localhost:8081/', {host:'localhost'});
req.end();

