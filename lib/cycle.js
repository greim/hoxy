/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Request = require('./request');
var Response = require('./response');
var streams = require('./streams');
var Base = require('./base');
var Body = require('./body');
var GhostServer = require('./ghost-server');
var await = require('await');
var http = require('http');
var url = require('url');
var path = require('path');

// ---------------------------

module.exports = Base.extend(function(){
  this._request = new Request();
  this._response = new Response();
  this._request.on('log', function(log){
    this.emit('log', log);
  }.bind(this));
  this._response.on('log', function(log){
    this.emit('log', log);
  }.bind(this));
},{

  data: Body.prototype.data,

  serve: function(/* docroot, [url], callback */){
    var args = getArgs(arguments);
    args.includeErrors = true;
    serve(args, this);
  },

  ghost: function(/* docroot, [url], callback */){
    var args = getArgs(arguments);
    args.includeErrors = false;
    serve(args, this);
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
        var rate = req._getRate();
        if (rate > 0){
          brake = streams.brake(rate);
        }
        var latency = req._getLatency();
        if (latency > 0){
          setTimeout(send, latency);
        } else {
          send();
        }
        function send(){
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
    return await('received')
    .run(function(prom){
      resp._sanitize();
      outResp.writeHead(resp.statusCode, resp.headers);
      var source = resp._source;
      var brake;
      var rate = resp._getRate();
      if (rate > 0){
        brake = streams.brake(rate);
      }
      var latency = resp._getLatency();
      if (latency > 0){
        setTimeout(send, latency);
      } else {
        send();
      }
      function send(){
        source.on('error', function(){
          prom.fail(err);
        });
        source.on('end', function(){
          prom.keep('received');
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

var statics = {};

function getServer(docroot){
  docroot = path.resolve(process.cwd(), docroot||'');
  var ghost = statics[docroot];
  if (!ghost){
    ghost = statics[docroot] = new GhostServer(docroot);
  }
  return ghost;
}

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

function serve(args, cycle){
  var ghost = getServer(args.docroot);
  ghost.serve({
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


