/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var Transaction = require('./transaction');
var serialize = require('./serializer');
var API = require('./hoxy-api');
var _ = require('lodash-node');
var url = require('url');
var http = require('http');

// ---------------------------

var Mitm = Base.extend(function(opts){

  var thisMitm = this;

  thisMitm._intercepts = {request:[],response:[],received:[]};

  thisMitm._server = http.createServer(function(inReq, outResp){

    // New transaction for each request.
    var transaction = new Transaction(),
      req = transaction._request,
      resp = transaction._response,
      api = new API(transaction);

    transaction.on('log', function(log){
      thisMitm.emit('log', log);
    });

    transaction.start()
    .then(function(){
      return req.setHttpSource(inReq, opts.stage);
    })
    .then(function(){
      return thisMitm.runPhase('request', api);
    })
    .catch(function(err){
      return thisMitm.emit('log',{
        level: 'error',
        message: 'request-phase error: '+err.message,
        error: err
      });
    })
    .then(function(){
      return transaction.sendToServer();
    })
    .then(function(got){
      return resp.setHttpSource(got.inResp);
    },function(err){
      return thisMitm.emit('log',{
        level: 'debug',
        message: err.message,
        error: err
      });
    })
    .then(function(){
      return thisMitm.runPhase('response', api);
    })
    .catch(function(err){
      return thisMitm.emit('log',{
        level: 'error',
        message: 'response-phase error: '+err.message,
        error: err
      });
    })
    .then(function(){
      return transaction.sendToClient(outResp);
    })
    .then(function(){
      return thisMitm.runPhase('received', api);
    })
    .catch(function(err){
      return thisMitm.emit('log',{
        level:'error',
        message:err.message,
        error:err
      });
    });
  });

  thisMitm._server.on('error', function(err){
    thisMitm.emit('log', {
      level:'error',
      message:'proxy server error: '+err.message,
      error: err
    });
  });

  thisMitm._server.listen(opts.port);

  setTimeout(function(){
    thisMitm.emit('log',{
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
    if (!this._intercepts.hasOwnProperty(phase)){
      throw new Error(phase ? 'invalid phase '+phase : 'missing phase');
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
  runPhase: function(phase, api){
    var req = api.request,
      resp = api.response;
    var intercepts = this._intercepts[phase];
    return serialize(intercepts, function(intercept, next){
      if (intercept.length >= 3){
        intercept.call(api, req, resp, next);
      } else {
        intercept.call(api, req, resp);
        next();
      }
    });
  }
});

module.exports = Mitm;




