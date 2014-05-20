/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Request = require('./request');
var Response = require('./response');
var streams = require('./streams');
var Base = require('./base');
var await = require('await');
var mkdirp = require('mkdirp');
var _ = require('lodash-node');
var static = require('node-static');
var http = require('http');
var https = require('https');
var url = require('url');
var os = require('os');
var fs = require('fs');
var util = require('util');
var PATH = require('path');
var zlib = require('zlib');
var isSecure = /https/i;

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

  serve: function(opts, cb, ctx){

    // First, get all our ducks in a row WRT to
    // options, setting variables, etc.
    ctx || (ctx = this);
    var req = this._request;
    var resp = this._response;
    if (typeof opts === 'string')opts={path:opts};
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
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    var fullPath = docroot + path.substring(1);

    // Now call the static file service.
    return await('staticResp').run(function(prom){
      check(strategy, fullPath, req, this._proxy._upstreamProxy)
      .onfail(prom.fail, prom)
      .onkeep(function(got){
        var kept = false;
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
          kept = true;
        }).on('error', function(err){
          if (!kept) prom.fail(err);
          else this.emit('log', {
            level: 'warn',
            message: err.message,
            error: err
          });
        }, this);
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
          got.staticResp.statusCode,
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

  _setPhase: function(phase){
    this._phase = this._request.phase = this._response.phase = phase;
  },

  _sendToServer: function(){
    var req = this._request,
      resp = this._response,
      upstreamProxy = this._proxy._upstreamProxy;

    return await('inRespProm','done')
    .run(function(prom){
      var inRespProm = await('inResp');
      prom.keep('inRespProm', inRespProm);
      if (resp._populated){
        inRespProm.keep('inResp', false);
        prom.keep('done');
      } else {
        req._sanitize();
        var outReq = requestWithProxy({
          protocol: req.protocol,
          proxy: upstreamProxy,
          hostname: req.hostname,
          port: req.port || req._getDefaultPort(),
          method: req.method,
          path: req.url,
          headers: req.headers
        }, function(inResp){
          inRespProm.keep('inResp', inResp);
        });
        outReq.on('error', function(err){
          inRespProm.fail(err);
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
          var tees = req._tees();
          tees.forEach(function(writable){
            source.pipe(writable);
          });
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
          source = source.pipe(brake);
        }
        source.pipe(outResp);
        var tees = resp._tees();
        tees.forEach(function(writable){
          source.pipe(writable);
        });
      }
    });
  },

  _start: function(){
    // for now, an immediately-kept promise
    return await('started').keep('started');
  }
});

// ---------------------------

var socketPath = os.tmpdir() + '/hoxy.socket';

// Windows Error: listen EACCES #21
// https://github.com/greim/hoxy/issues/21
// unix domain socket don't work on windows
// but this named pipe syntax is available
// http://dailyjs.com/2012/05/24/windows-and-node-4/
var winPipe = '\\\\.\\pipe\\hoxy.pipe';
if (process.platform === 'win32'){
  socketPath = winPipe;
}

// Set up a local server listening on a socket.
await('socket-ready').run(function(p){
  if (socketPath === winPipe){
    p.keep('socket-ready');
  } else {
    // Socket is ready once any existing one is removed.
    fs.exists(socketPath, function(exists){
      if (exists){
        fs.unlink(socketPath, p.nodify('socket-ready'));
      } else {
        p.keep('socket-ready');
      }
    });
  }
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
function check(strategy, file, req, upstreamProxy){
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
          var mirrorReq = requestWithProxy({
            protocol: req.protocol,
            proxy: upstreamProxy,
            method: 'GET',
            hostname: req.hostname,
            port: req.port,
            path: req.url
          }, function(mirrResp){
            if (mirrResp.statusCode !== 200){
              prom.fail(new Error('mirroring failed: '+req.fullUrl()+' => '+mirrResp.statusCode));
              return;
            }
            // TODO: test coverage for mkdirp
            mkdirp(PATH.dirname(file), function(err){
              if (err){
                prom.fail(err);
                return;
              }
              var writable = fs.createWriteStream(file);
              var readable = mirrResp;
              if (mirrResp.headers['content-encoding'] === 'gzip'){
                // TODO: test coverage
                var gunzip = zlib.createGunzip();
                readable = readable.pipe(gunzip);
              }
              readable.pipe(writable);
              readable.on('end', function(){
                prom.keep('created', true);
              });
              writable.on('error', function(err){
                prom.fail(err);
              });
            });
          });
          mirrorReq.on('error', function(err){
            prom.fail(err);
          });
          mirrorReq.end();
        }
      });
    }
  });
}

function requestWithProxy(opts, callback){
  var requestClass = isSecure.test(opts.protocol) ? https : http;

  if (opts.proxy){  
    var proxyInfo = url.parse(opts.proxy);
    var proxyPort = proxyInfo.port;
    var proxyHostname = proxyInfo.hostname;
    var proxyPath = 'http://' + opts.hostname + (opts.port?':'+opts.port:'') + opts.path;
    opts.hostname = proxyHostname;
    opts.port = proxyPort;
    opts.path = proxyPath;
  }
  return requestClass.request(opts, callback);
}
  






