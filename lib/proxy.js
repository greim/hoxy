/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var _ = require('lodash-node');
var url = require('url');
var Base = require('./base');
var http = require('http');
var Cycle = require('./cycle');
var cheerio = require('cheerio');
var serializer = require('./serializer');
var querystring = require('querystring');
var RoutePattern = require('route-pattern');

// --------------------------------------------------

module.exports = Base.extend(function(opts){

  var thisProxy = this;

  if (opts.log){
    this.log(opts.log);
  }

  thisProxy._intercepts = {
    request:[],
    sent:[],
    response:[],
    received:[]
  };

  // --------------------------------------------------

  thisProxy._server = http.createServer(function(inReq, outResp){

    // New cycle for each request.
    var cycle = new Cycle(),
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
      cycle._setPhase('sent');
      return thisProxy._runIntercepts('sent', cycle);
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
      // <= promise 'received'
    })
    .then(function(){
      cycle._setPhase('received');
      return thisProxy._runIntercepts('received', cycle);
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

  thisProxy._server.listen(opts.port);

  setTimeout(function(){
    thisProxy.emit('log',{
      level:'info',
      message:'proxy listening on port '+opts.port
    });
  },0);
},{

  // --------------------------------------------------

  intercept: function(opts, intercept){
    if (typeof opts === 'string'){
      opts = {phase:opts};
    }
    var phase = opts.phase;
    if (!this._intercepts.hasOwnProperty(phase)){
      throw new Error(phase ? 'invalid phase '+phase : 'missing phase');
    }
    if (opts.type){
      if (!typeHandlers[opts.type]){
        throw new Error('invalid type: ' + opts.type);
      }
      if (phase === 'sent' || phase === 'received'){
        throw new Error('cannot intercept ' + opts.type + ' in ' + phase + ' phase');
      }
    }
    intercept = typeIntercept(opts, intercept);
    intercept = filterIntercept(opts, intercept);
    intercept = lineIntercept(opts, intercept);
    intercept = urlIntercept(opts, intercept);
    this._intercepts[phase].push(intercept);
  },

  close: function(){
    this._server.close();
  },

  log: function(level, handler){
    if (handler){
      this.on('log', handler);
    } else {
      var logger = new Logger(level);
      this.on('log', function(log){
        var message = log.message;
        if (log.error){
          message+='\n'+log.error.stack;
        }
        logger[log.level](message);
      });
    }
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
          self.trigger('log', {
            level: 'warn',
            message: 'an async '+phase+' intercept is taking a long time'
          });
        }, 5000);
        intercept.call(cycle, req, resp, function(){
          clearTimeout(t);
          next();
        });
      } else {
        intercept.call(cycle, req, resp);
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

function urlIntercept(opts, intercept){
  if (opts.url){
    var origIntercept = intercept;
    var test = getUrlTester(opts.url);
    intercept = function(req, resp, done){
      var fullUrl = req.fullUrl();
      if (test(fullUrl)){
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

function lineIntercept(opts, intercept){
  if (opts.line){
    var origIntercept = intercept;
    var parts = opts.line.match(/^([A-Z]+)\s+(.+)$/);
    var testMethod = parts[1];
    var testUrl = parts[2];
    var test = getUrlTester(testUrl);
    intercept = function(req, resp, done){
      var fullUrl = req.fullUrl();
      if (testMethod === req.method && test(fullUrl)){
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

function typeIntercept(opts, intercept){
  if (opts.type){
    var origIntercept = intercept;
    intercept = function(req, resp, done){
      var args = arguments;
      var r = opts.phase === 'request' ? req : resp;
      r._load(function(err){
        if (err) {
          done(err);
        } else {
          try{
            typeHandlers[opts.type](r);
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
      var pattern = RoutePattern.fromString(testUrl);
      sCache[testUrl] = function(u){
        return pattern.matches(u);
      };
      return sCache[testUrl];
    }
  }
})();


var typeHandlers = {
  '$': function(r){
    r.$ = cheerio.load(r._source.toString());
  },
  'json': function(r){
    r.json = JSON.parse(r._source.toString());
  },
  'params': function(r){
    r.params = querystring.parse(r._source.toString());
  },
  'buffers': function(){},
  'string': function(){}
};
