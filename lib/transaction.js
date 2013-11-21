/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var serialize = require('./serializer');
var Request = require('./request');
var Response = require('./response');
var await = require('await');
var http = require('http');
var url = require('url');

// ---------------------------

function Transaction(){
  this.request = new Request();
  this.response = new Response();
}

Transaction.prototype = {

  /*
   * Set the initial request info but not the entity body.
   */
  setRequestInfo: function(inReq, resolver){
    var u = inReq.url;
    if (resolver){
      u = url.resolve(resolver, u);
    }
    var purl = url.parse(u);
    this.request._setRawData({
      protocol: purl.protocol,
      hostname: purl.hostname,
      port: purl.port,
      method: inReq.method,
      url: purl.path,
      headers: inReq.headers
    });
  },

  /*
   * Return a promise that keeps when this transaction's request is fully
   * populated.
   */
  loadRequestBody: function(inReq) {
    return await('done')
    .run(function(prom){
      if (this.request.isPiped()){
        this.request.setReadableStream(inReq);
        prom.keep('done');
      } else {
        var buffers = [];
        inReq.on('data', function(chunk){
          buffers.push(chunk);
        });
        inReq.on('error', function(err){
          prom.fail(err);
        });
        inReq.on('end', function(){
          this.request.buffers = buffers;
          prom.keep('done');
        }.bind(this));
      }
    }, this);
  },

  /*
   * Initiate a client request to the server represented by the request.
   */
  serverFetch: function(){
    return await('done')
    .run(function(prom){
      if (this.response.isPopulated()){
        prom.keep('done');
      } else {
        this.request.sanitize();
        var outReq = http.request({
          hostname: this.request.hostname,
          port: this.request.port || this.request.getDefaultPort(),
          method: this.request.method,
          path: this.request.url,
          headers: this.request.headers
        }, function(inResp){
          this.setResponseInfo(inResp);
          this.loadResponseBody(inResp)
          .onkeep(function(){
            prom.keep('done');
          });
        }.bind(this));
        var readable = this.request.getReadableStream();
        readable.on('error', function(){
          prom.fail(err);
        });
        readable.pipe(outReq);
      }
    }, this);
  },

  setResponseInfo: function(inResp){
    this.response._setRawData({
      statusCode: inResp.statusCode,
      headers: inResp.headers
    });
  },

  /*
   * Return a promise that keeps when this transaction's response is fully
   * populated.
   */
  loadResponseBody: function(inResp){
    return await('done')
    .run(function(prom){
      if (this.response.isPiped()){
        this.response.setReadableStream(inResp);
        prom.keep('done');
      } else {
        var buffers = [];
        inResp.on('data', function(chunk){
          buffers.push(chunk);
        });
        inResp.on('error', function(err){
          prom.fail(err);
        });
        inResp.on('end', function(){
          this.response.buffers = buffers;
          prom.keep('done');
        }.bind(this));
      }
    }, this);
  },

  /*
   * Send a response back to the client
   */
  clientSend: function(outResp){
    return await('sent')
    .run(function(prom){
      this.response.sanitize();
      outResp.writeHead(this.response.statusCode, this.response.headers);
      var readable = this.response.getReadableStream();
      readable.on('error', function(){
        prom.fail(err);
      });
      readable.on('end', function(){
        prom.keep('sent');
      });
      readable.pipe(outResp);
    }, this);
  },

  /*
   * Return a promise signalling this transaction has started.
   */
  start: function(){
    // for now, an immediately-kept promise
    return await('started').keep('started');
  }
};


function Response(){}

module.exports = Transaction;
