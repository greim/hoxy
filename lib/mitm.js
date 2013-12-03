/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var Cycle = require('./transaction');
var serialize = require('./serializer');
var DomReader = require('./dom-reader');
var JsonReader = require('./json-reader');
var _ = require('lodash-node');
var cheerio = require('cheerio');
var url = require('url');
var http = require('http');

// ---------------------------

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
      return req.setHttpSource(inReq, opts.reverse);
      // <= undefined
    })
    .then(function(){
      return thisProxy._runPhase('request', cycle);
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
      return thisProxy._runPhase('sent', cycle);
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
          message: 'server fetch skipped for '+req.getAbsoluteUrl()
        });
        // <= undefined
      } else {
        return resp.setHttpSource(got.inResp);
        // <= undefined
      }
    })
    .then(function(){
      return thisProxy._runPhase('response', cycle);
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
      return thisProxy._runPhase('received', cycle);
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

  /*
   * Append a function to the list of functions that will execute during the
   * request or response phase.
   */
  intercept: function(phase, cb){
    var qualifier, match;
    var origPhase = phase;
    var patt = /^([^:]+):([^:]+)$/;
    if (match = phase.match(patt)){
      phase = match[1];
      qualifier = match[2];
    }
    if (!this._intercepts.hasOwnProperty(phase)){
      throw new Error(phase ? 'invalid phase '+phase : 'missing phase');
    }
    if (qualifier){
      this._intercepts[phase].push(function(req, resp, done){
        if (phase === 'sent' || phase === 'received'){
          done(new Error('cannot intercept '+origPhase+'. '+qualifier+' is unavailable in '+phase+' phase'));
        } else {
          var r = phase === 'request' ? req : resp;
          r.load(function(err){
            if (err) {
              done(err);
            } else {
              var body = r.source.toString();
              try{
                if (qualifier === '$'){
                  var $ = cheerio.load(body);
                  r.source = new DomReader($);
                } else if (qualifier === 'json'){
                  var obj = JSON.parse(body);
                  r.source = new JsonReader(obj);
                } else {
                  throw new Error('unknown phase qualifier: '+qualifier);
                }
                done();
              } catch(err) {
                done(err);
              }
            }
          });
        }
      });
    }
    this._intercepts[phase].push(cb);
  },

  /*
   * Shut down the proxy server.
   */
  close: function(){
    this._server.close();
  },

  /*
   * Run all phase callbacks set by the above method for the given phase.
   */
  _runPhase: function(phase, cycle){
    var req = cycle._request,
      resp = cycle._response,
      self = this;
    var intercepts = this._intercepts[phase];
    return serialize(intercepts, function(intercept, next){
      if (intercept.length >= 3){
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
  },
  log: function(level){
    var logger = new Logger(level);
    this.on('log', function(log){
      var message = log.message;
      if (log.error){
        message+='\n'+log.error.stack;
      }
      logger[log.level](message);
    });
  }
});




