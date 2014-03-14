/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var _ = require('lodash-node');
var url = require('url');
var Base = require('./base');
var http = require('http');
var path = require('path');
var Cycle = require('./cycle');
var cheerio = require('cheerio');
var serializer = require('./serializer');
var querystring = require('querystring');
var RoutePattern = require('route-pattern');

// --------------------------------------------------

module.exports = Base.extend(function(opts){

  opts || (opts = {});

  var thisProxy = this;

  if (opts.reverse){
    this._reverse = opts.reverse;
  }

  if (opts.upstreamProxy){
    this._upstreamProxy = opts.upstreamProxy;
  }

  thisProxy._intercepts = {
    'request':[],
    'request-sent':[],
    'response':[],
    'response-sent':[]
  };

  // --------------------------------------------------

  thisProxy._server = http.createServer(function(inReq, outResp){

    // New cycle for each request.
    var cycle = new Cycle(thisProxy),
      req = cycle._request,
      resp = cycle._response;

    cycle.on('log', function(log){
      thisProxy.emit('log', log);
    });

    cycle._start()
    .then(function(){
      return req._setHttpSource(inReq, opts.reverse);
      // <= undefined
    })
    .then(function(){
      cycle._setPhase('request');
      return thisProxy._runIntercepts('request', cycle);
      // <= promise 'done'
    })
    .catch(function(err){
      return thisProxy.emit('log',{
        level: 'error',
        message: 'request-phase error: '+err.message,
        error: err
      });
      // <= undefined
    })
    .then(function(){
      return cycle._sendToServer();
      // <= promise 'inRespProm', 'done'
    })
    .then(function(got){
      cycle._setPhase('request-sent');
      return thisProxy._runIntercepts('request-sent', cycle);
      // <= promise 'done'
    })
    .catch(function(err){
      return thisProxy.emit('log',{
        level: 'error',
        message: err.message,
        error: err
      });
      // <= undefined
    })
    .then(function(got){
      return got.inRespProm; // gotten several thens ago
      // <= promise 'inResp'
    })
    .then(function(got){
      if (!got.inResp){
        return thisProxy.emit('log',{
          level: 'debug',
          message: 'server fetch skipped for '+req.fullUrl()
        });
        // <= undefined
      } else {
        return resp._setHttpSource(got.inResp);
        // <= undefined
      }
    })
    .then(function(){
      cycle._setPhase('response');
      return thisProxy._runIntercepts('response', cycle);
      // <= promise 'done'
    })
    .catch(function(err){
      return thisProxy.emit('log',{
        level: 'error',
        message: 'response-phase error: '+err.message,
        error: err
      });
      // <= undefined
    })
    .then(function(){
      return cycle._sendToClient(outResp);
      // <= promise 'response-sent'
    })
    .then(function(){
      cycle._setPhase('response-sent');
      return thisProxy._runIntercepts('response-sent', cycle);
      // <= promise 'done'
    })
    .catch(function(err){
      return thisProxy.emit('log',{
        level:'error',
        message:err.message,
        error:err
      });
      // <= undefined
    });
  });

  thisProxy._server.on('error', function(err){
    thisProxy.emit('log', {
      level:'error',
      message:'proxy server error: '+err.message,
      error: err
    });
  });
},{

  // --------------------------------------------------

  listen: function(port){
    // TODO: test bogus port
    this._server.listen(port);
    var message = 'proxy listening on '+port;
    if (this._reverse){
      message += ', reverse ' + this._reverse;
    }
    this.emit('log', {
      level: 'info',
      message: message
    });
    return this;
  },

  intercept: function(opts, intercept){
    // TODO: test string versus object
    // TODO: test opts is undefined
    if (typeof opts === 'string'){
      opts = {phase:opts};
    }
    var phase = opts.phase;
    if (!this._intercepts.hasOwnProperty(phase)){
      throw new Error(phase ? 'invalid phase '+phase : 'missing phase');
    }
    if (opts.as){
      if (!asHandlers[opts.as]){
        // TODO: test bogus as
        throw new Error('invalid as: ' + opts.as);
      }
      if (phase === 'request-sent' || phase === 'response-sent'){
        // TODO: test intercept as in read only phase
        throw new Error('cannot intercept ' + opts.as + ' in phase ' + phase);
      }
    }
    intercept = asIntercept(opts, intercept); // TODO: test asIntercept this, args, async
    intercept = filterIntercept(opts, intercept); // TODO: test filterIntercept this, args, async
    intercept = otherIntercept(opts, intercept); // TODO: test otherIntercept this, args, async
    this._intercepts[phase].push(intercept);
  },

  close: function(){
    this._server.close();
  },

  log: function(events, cb){
    var listenTo = {};
    events.split(/\s/).map(function(s){
      return s.trim();
    }).filter(function(s){
      return !!s;
    }).forEach(function(s){
      listenTo[s] = true;
    });
    if (!cb){
      var writable = process.stderr;
    } else if (cb.write) {
      var writable = cb;
    }
    this.on('log', function(log){
      if (!listenTo[log.level]) return;
      var message = log.error ? log.error.stack : log.message;
      if (writable){
        writable.write(log.level.toUpperCase() + ': ' + message+'\n');
      } else if (typeof cb === 'function'){
        cb(log);
      }
    });
  },

  // --------------------------------------------------

  _runIntercepts: function(phase, cycle){
    var req = cycle._request,
      resp = cycle._response,
      self = this;
    var intercepts = this._intercepts[phase];
    return serializer.serialize(intercepts, function(intercept, next){
      if (isAsync(intercept)){
        var t = setTimeout(function(){
          self.emit('log', {
            level: 'debug',
            message: 'an async '+phase+' intercept is taking a long time: '+req.fullUrl()
          });
        }, 5000);
        intercept.call(cycle, req, resp, function(err){
          clearTimeout(t);
          next(err);
        });
      } else {
        try { intercept.call(cycle, req, resp); }
        catch(err) { next(err); }
        next();
      }
    });
  }
});

// ---------------------------------------------------

function isAsync(fun){
  return fun.length >= 3;
}

function filterIntercept(opts, intercept){
  if (opts.filter){
    var origIntercept = intercept;
    intercept = function(req, resp, done){
      if (opts.filter(req, resp)){
        origIntercept.apply(this, arguments);
        if (!isAsync(origIntercept)){
          done();
        }
      } else {
        done();
      }
    };
  }
  return intercept;
}

var otherIntercept = (function(){
  var ctPatt = /;.*$/;
  function test(tester, testee, isUrl){
    if (tester === undefined) return true;
    if (tester instanceof RegExp) return tester.test(testee);
    if (isUrl) return getUrlTester(tester)(testee);
    return tester == testee;
  }
  return function(opts, intercept){
    var isReq = opts.phase === 'request' || opts.phase === 'request-sent';
    return function(req, resp, done){
      var reqContentType = req.headers['content-type'];
      var respContentType = resp.headers['content-type'];
      var reqMimeType = reqContentType?reqContentType.replace(ctPatt, ''):undefined;
      var respMimeType = respContentType?respContentType.replace(ctPatt, ''):undefined;
      var contentType, mimeType;
      contentType = isReq ? reqContentType : respContentType;
      mimeType = isReq ? reqMimeType : respMimeType;
      var isMatch = 1;

      isMatch &= test(opts.contentType, contentType);
      isMatch &= test(opts.mimeType, mimeType);
      isMatch &= test(opts.requestContentType, reqContentType);
      isMatch &= test(opts.responseContentType, respContentType);
      isMatch &= test(opts.requestMimeType, reqMimeType);
      isMatch &= test(opts.responseMimeType, respMimeType);
      isMatch &= test(opts.protocol, req.protocol);
      isMatch &= test(opts.host, req.headers.host);
      isMatch &= test(opts.hostname, req.hostname);
      isMatch &= test(opts.port, req.port);
      isMatch &= test(opts.method, req.method);
      isMatch &= test(opts.url, req.url, true);
      isMatch &= test(opts.fullUrl, req.fullUrl(), true);
      if (isMatch){
        intercept.apply(this, arguments);
        if (!isAsync(intercept)){
          done();
        }
      } else {
        done();
      }
    }
  }
})();

function asIntercept(opts, intercept){
  if (opts.as){
    var origIntercept = intercept;
    intercept = function(req, resp, done){
      var args = arguments;
      var r = opts.phase === 'request' ? req : resp;
      r._load(function(err){
        if (err) {
          done(err);
        } else {
          try{
            asHandlers[opts.as](r);
            origIntercept.apply(this, args);
            if (!isAsync(origIntercept)){
              done();
            }
          } catch(err) {
            done(err);
          }
        }
      }, this); // ################################ TEST!
    };
  }
  return intercept;
}

// TODO: test direct url string comparison, :id tags, wildcard, regexp
// TODO: test line direct url string comparison, :id tags, wildcard
var getUrlTester = (function(){
  var sCache = {},
    rCache = {};
  return function(testUrl){
    if (testUrl instanceof RegExp){
      if (!rCache[testUrl]){
        rCache[testUrl] = function(u){
          return testUrl.test(u);
        };
      }
      return rCache[testUrl];
    } else {
      if (!sCache[testUrl]){
        if (!testUrl){
          sCache[testUrl] = function(u){
            return testUrl == u;
          };
        } else {
          var pattern = RoutePattern.fromString(testUrl);
          sCache[testUrl] = function(u){
            return pattern.matches(u);
          };
        }
      }
      return sCache[testUrl];
    }
  }
})();

// TODO: test all five for both requet and response
var asHandlers = {
  '$': function(r){
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    r.$ = cheerio.load(r._source.toString());
  },
  'json': function(r){
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    r.json = JSON.parse(r._source.toString());
  },
  'params': function(r){
    // TODO: test to ensure that parse errors here propagate to error log.
    // TODO: test to ensure that parse errors here fail gracefully.
    r.params = querystring.parse(r._source.toString());
  },
  'buffers': function(){},
  'string': function(){}
};
