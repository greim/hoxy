/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var hoxy = require('../hoxy');
var chunker = require('../lib/chunker');
var streams = require('../lib/streams');
var _ = require('lodash-node');
var await = require('await');
var http = require('http');

// ---------------------------

/*
 * Utility for testing.
 * --------------------
 * This method sets up and tears down an entire client/proxy/server system, and
 * sends a request through it, allowing you to analyze the transaction at each
 * step along the way.
 * 
 * roundTrip({
 *   request: {
 *     // details of request go here
 *   },
 *   response: {
 *     // details of response go here
 *   },
 *   startIntercept: function(req, resp, [next]){
 *     // manipulate request before body
 *   },
 *   requestIntercept: function(req, resp, [next]){
 *     // manipulate request
 *   },
 *   server: function(nativeRequest, body){
 *     // analyze what server receives
 *   },
 *   responseIntercept: function(req, resp, [next]){
 *     // manipulate response
 *   },
 *   client: function(nativeResponse, body){
 *     // analyze what client receives
 *   }
 * });
 */

var body = '<!doctype html><html><head><title>page</title></head><body><p>para</p></body></html>',
  waiting = await('next').keep('next');

module.exports = function roundTrip(opts,me){
  waiting.then(function(){
    var server;
    waiting = await('next');
    var defaults = {
      proxyOptions: {
        port: 8181
      },
      request: {
        protocol: 'http:',
        hostname: 'localhost',
        port: 8282,
        method: 'GET',
        url: '/',
        headers: {
          host: 'localhost:8282'
        },
        body: ''
      },
      response: {
        statusCode: 200,
        headers: {
          'host': 'localhost:8282',
          'content-type': 'text/html',
          'content-length': body.length
        },
        body: body
      },
      startIntercept: function(){},
      requestIntercept: function(){},
      server: function(){},
      responseIntercept: function(){},
      client: function(){},
      error: function(){}
    };
    opts = _.merge(defaults, opts);
    var proxy = hoxy.start(opts.proxyOptions);
    proxy.on('log',function(log){
      if (log.level === 'error'){
        opts.error(log.error, log.message);
      }
    });
    proxy.intercept('request', opts.requestIntercept);
    proxy.intercept('response', opts.responseIntercept);
    proxy.intercept('request', function(req){
      server = http.createServer(function(sReq, sResp){
        streams.collect(sReq)
        .onkeep(function(got){
          opts.server(sReq, chunker.chunksToString(got.buffers));
          opts.response.headers['content-length'] = new Buffer(opts.response.body, 'utf8').length;
          sResp.writeHead(opts.response.statusCode, opts.response.headers);
          if (opts.response.body) {
            sResp.end(opts.response.body);
          } else {
            sResp.end();
          }
        })
        .onfail(function(err){
          console.log(err);
        });
      }).listen(req.port);
    });
    if (opts.proxyOptions.stage) {
      var url = opts.proxyOptions.url;
    } else {
      var url = opts.request.protocol
        + '//'
        + opts.request.hostname
        + (opts.request.port ? ':'+opts.request.port : '')
        + opts.request.url;
    }
    var cReq = http.request({
      hostname: 'localhost',
      port: opts.proxyOptions.port,
      path: url,
      method: opts.request.method,
      headers: opts.request.headers
    }, function(cResp){
      streams.collect(cResp)
      .onkeep(function(got){
        opts.client(cResp, chunker.chunksToString(got.buffers));
      })
      .onfail(function(err){
        console.log(err);
      })
      .onresolve(function(){
        proxy.close();
        server.close();
        waiting.keep('next');
      });
    });
    if (opts.request.body) {
      cReq.write(opts.request.body, 'utf8');
    }
    cReq.end();
  });
};
