/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Request = require('./request');
var Response = require('./response');
var streams = require('./streams');
var Base = require('./base');
var Body = require('./body');
//var staticServers = require('./static-servers');
var await = require('await');
var _ = require('lodash-node');
var static = require('node-static');
var http = require('http');
var url = require('url');
var os = require('os');
var fs = require('fs');

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

  //serve: function(/* docroot, [url], callback */){
  //  var args = getArgs(arguments);
  //  args.includeErrors = true;
  //  staticServers.promiseServer(args.docroot)
  //  .onkeep(function(got){
  //    serve(args, this, got.server);
  //  }, this)
  //  .onfail(function(err){
  //    this.emit('log', {
  //      level:'error',
  //      message:err.message,
  //      error:err
  //    });
  //  }, this);
  //},

  serve: function(opts, cb, ctx){

    // First, get all our ducks in a row WRT to
    // options, setting variables, etc.
    ctx || (ctx = this);
    var req = this._request;
    var resp = this._response;
    opts = _.extend({
      docroot: '/',
      path: req.url,
      strategy: 'replace'
    }, opts);
    var docroot = opts.docroot;
    var path = opts.path;
    var strategy = opts.strategy;
    if (!/\/$/.test(docroot)) docroot = docroot + '/';
    if (!/^\//.test(path)) path = '/' + path;
    var headers = _.extend({
      'x-hoxy-static-docroot': docroot
    }, req.headers);
    var fullPath = docroot + path.substring(1);

    // Now call the static file service.
    return await('staticResp').run(function(prom){
      check(strategy, fullPath, req, resp)
      .onfail(prom.fail, prom)
      .onkeep(function(got){
        if (got.created){
          this.emit('log', {
            level: 'info',
            message: 'copied '+req.fullUrl()+' to '+fullPath
          });
        }
        http.get({
          socketPath: socketPath,
          headers: headers,
          path: path
        }, function(staticResp){
          prom.keep('staticResp', staticResp);
        });
      }, this);
    }, this)

    // Now deal with the static response.
    .onkeep(function(got){
      var code = got.staticResp.statusCode+'';
      var useResponse;
      var isError;
      if (/^2\d\d$/.test(code)){
        useResponse = true; // obviously
      } else if (/^4\d\d$/.test(code)){
        if (strategy === 'replace'){
          useResponse = true; // yep
        } else if (strategy === 'mirror') {
          isError = true; // e.g., because fetch returned 404
        }
      } else {
        isError = true; // nope
      }
      if (isError){
        var message = util.format(
          'Failed to serve static file: %s => %s. Static server returned %d. Strategy: %s',
          req.fullUrl(),
          fullPath,
          stResp.statusCode,
          strategy
        );
        cb.call(this, new Error(message));
      } else if (useResponse){
        resp._setHttpSource(got.staticResp);
        cb.call(this);
      } else {
        cb.call(this); // it will fall through
      }
    }, this)

    // Or, deal with an error.
    .onfail(function(err){
      cb.call(this, err)
    }, this);
  },

  //ghost: function(/* docroot, [url], callback */){
  //  var args = getArgs(arguments);
  //  args.includeErrors = false;
  //  staticServers.promiseServer(args.docroot)
  //  .onkeep(function(got){
  //    serve(args, this, got.server);
  //  }, this)
  //  .onfail(function(err){
  //    this.emit('log', {
  //      level:'error',
  //      message:err.message,
  //      error:err
  //    });
  //  }, this);
  //},

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

//function getArgs(args){
//  var args = Array.prototype.slice.call(args);
//  var docroot = args.shift();
//  if (args.length >= 2){
//    var url = args.shift();
//  }
//  var callback = args.shift();
//  return {
//    url: url,
//    docroot: docroot,
//    callback: callback
//  };
//}
//function serve(args, cycle, server){
//  server.serve({
//    request: cycle._request,
//    response: cycle._response,
//    url: args.url || cycle._request.url
//  })
//  .onkeep(function(got){
//    if (got.response.statusCode < 400 || args.includeErrors){
//      cycle._response._setHttpSource(got.response);
//    }
//    args.callback.call(null);
//  },cycle)
//  .onfail(function(err){
//    args.callback.call(null, err);
//  });
//}


var socketPath = os.tmpdir() + '/hoxy.socket';

// Set up a local server listening on a socket.
await('socket-ready').run(function(p){
  // Socket is ready once any existing one is removed.
  fs.exists(socketPath, function(exists){
    if (exists){
      fs.unlink(socketPath, p.nodify('socket-ready'));
    } else {
      p.keep('socket-ready');
    }
  });
}).then(function(){
  // Start up the server and serve out of various docroots.
  var server = http.createServer(function(req, resp){
    var docroot = req.headers['x-hoxy-static-docroot'];
    var stat = getStatic(docroot);
    stat.serve(req, resp);
  });
  server.listen(socketPath);
},function(err){
  console.error(err.stack);
});

var getStatic = (function(){
  var statics = {};
  return function(docroot){
    var stat = statics[docroot];
    if (!stat){
      stat = statics[docroot] = new static.Server(docroot);
    }
    return stat;
  }
})();

// Ensure the existence of a file before it's requested,
// IF required by the given strategy.
function check(strategy, file, req, resp){
  var parsed = url.parse(file);
  file = parsed.pathname; // stripped of query string.
  return await('created').run(function(prom){
    if (strategy !== 'mirror'){
      prom.keep('created', false);
    } else {
      fs.exists(file, function(exists){
        if (exists){
          prom.keep('created', false);
        } else {
          http.get({
            hostname: req.hostname,
            port: req.port,
            path: req.url,
            headers: req.headers
          }, function(mResp){
            var writable = fs.createWriteStream(file);
            mResp.pipe(writable);
            writable.on('finish', function(){
              prom.keep('created', true);
            });
            writable.on('error', function(err){
              prom.fail(err);
            });
          });
        }
      });
    }
  });
}
