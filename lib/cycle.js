/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Request = require('./request');
var Response = require('./response');
var streams = require('./streams');
var Base = require('./base');
var Body = require('./body');
var staticServers = require('./static-servers');
var await = require('await');
var http = require('http');
var url = require('url');

// ---------------------------

module.exports = Base.extend(function(proxy){
  this._proxy = proxy;
  this._request = new Request();
  this._response = new Response();
  this._request.on('log', function(log){
    this.emit('log', log);
  }.bind(this));
  this._response.on('log', function(log){
    this.emit('log', log);
  }.bind(this));
},{

  data: function(name, val){
    if (!this._userData){
      this._userData = {};
    }
    if (arguments.length === 2){
      this._userData[name] = val;
    }
    return this._userData[name];
  },

  serve: function(/* docroot, [url], callback */){
    var args = getArgs(arguments);
    args.includeErrors = true;
    staticServers.promiseServer(args.docroot)
    .onkeep(function(got){
      serve(args, this, got.server);
    }, this)
    .onfail(function(err){
      this.emit('log', {
        level:'error',
        message:err.message,
        error:err
      });
    }, this);
  },

  ghost: function(/* docroot, [url], callback */){
    var args = getArgs(arguments);
    args.includeErrors = false;
    staticServers.promiseServer(args.docroot)
    .onkeep(function(got){
      serve(args, this, got.server);
    }, this)
    .onfail(function(err){
      this.emit('log', {
        level:'error',
        message:err.message,
        error:err
      });
    }, this);
  },

  _setPhase: function(phase){
    this._phase = this._request.phase = this._response.phase = phase;
  },

  _sendToServer: function(){
    var req = this._request,
      resp = this._response;

    return await('inRespProm','done')
    .run(function(prom){
      var inRespProm = await('inResp');
      prom.keep('inRespProm', inRespProm);
      if (resp._populated){
        inRespProm.keep('inResp', false);
        prom.keep('done');
      } else {
        req._sanitize();
        var outReq = http.request({
          hostname: req.hostname,
          port: req.port || req.getDefaultPort(),
          method: req.method,
          path: req.url,
          headers: req.headers
        }, function(inResp){
          inRespProm.keep('inResp', inResp);
        });
        var source = req._source;
        var brake;
        var slow = req.slow();
        var rate = slow.rate;
        if (rate > 0){
          brake = streams.brake(rate);
        }
        var latency = slow.latency;
        if (latency > 0){
          setTimeout(send, latency); // TODO: set timeout calculating time since request was received, in order to make latency behave as a limit
        } else {
          send();
        }
        function send(){
          // TODO: test to ensure that JsonReader, DomReader, ParamReader (etc) throw errors here which propagate to an error in the log output.
          if (brake){
            source = source.pipe(brake);
          }
          source.on('error', function(){
            prom.fail(err);
          });
          source.on('end', function(){
            prom.keep('done');
          });
          source.pipe(outReq);
        }
      }
    });
  },

  _sendToClient: function(outResp){
    var resp = this._response;
    return await('response-sent')
    .run(function(prom){
      resp._sanitize();
      outResp.writeHead(resp.statusCode, resp.headers);
      var source = resp._source;
      var brake;
      var slow = resp.slow();
      var rate = slow.rate;
      if (rate > 0){
        brake = streams.brake(rate);
      }
      var latency = slow.latency;
      if (latency > 0){
        setTimeout(send, latency);
      } else {
        send();
      }
      function send(){
        // TODO: test to ensure that JsonReader, DomReader, ParamReader (etc) throw errors here which propagate to an error in the log output.
        source.on('error', function(){
          prom.fail(err);
        });
        source.on('end', function(){
          prom.keep('response-sent');
        });
        if (brake){
          source.pipe(brake).pipe(outResp);
        } else {
          source.pipe(outResp);
        }
      }
    });
  },

  _start: function(){
    // for now, an immediately-kept promise
    return await('started').keep('started');
  }
});

// ---------------------------

function getArgs(args){
  var args = Array.prototype.slice.call(args);
  var docroot = args.shift();
  if (args.length >= 2){
    var url = args.shift();
  }
  var callback = args.shift();
  return {
    url: url,
    docroot: docroot,
    callback: callback
  };
}

function serve(args, cycle, server){
  server.serve({
    request: cycle._request,
    response: cycle._response,
    url: args.url || cycle._request.url
  })
  .onkeep(function(got){
    if (got.response.statusCode < 400 || args.includeErrors){
      cycle._response._setHttpSource(got.response);
    }
    args.callback.call(null);
  },cycle)
  .onfail(function(err){
    args.callback.call(null, err);
  });
}


