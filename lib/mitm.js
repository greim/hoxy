/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var Transaction = require('./transaction');
var serialize = require('./serializer');
var _ = require('lodash-node');
var url = require('url');
var http = require('http');

// ---------------------------

var Mitm = Base.extend(function(opts){

  var mitm = this;
  this.intercepts = {start:[],request:[],response:[]};

  this.server = http.createServer(function(inReq, outResp){

    // New transaction for each request.
    var transaction = new Transaction();
    transaction.request.on('log', function(log){
      mitm.emit('log', log);
    });
    transaction.response.on('log', function(log){
      mitm.emit('log', log);
    });

    // Start the transaction.
    transaction.start()

    // Set headers only.
    .then(function(){
      transaction.setRequestInfo(inReq, opts.stage);
    })

    // Run any start-phase logic.
    .then(function(){
      return mitm.runPhase('start', transaction);
    })

    // catch errors
    .catch(function(err){
      mitm.emit('log',{
        level: 'error',
        message: 'start-phase error: '+err.message,
        error: err
      });
    })

    // Load incoming request data.
    .then(function(){
      return transaction.loadRequestBody(inReq);
    })

    // Run any request-phase logic.
    .then(function(){
      return mitm.runPhase('request', transaction);
    })

    // catch errors
    .catch(function(err){
      mitm.emit('log',{
        level: 'error',
        message: 'request-phase error: '+err.message,
        error: err
      });
    })

    // Send to the server.
    .then(function(){
      return transaction.serverFetch();
    })

    // Run any response-phase logic.
    .then(function(){
      return mitm.runPhase('response', transaction);
    })

    // catch errors
    .catch(function(err){
      mitm.emit('log',{
        level: 'error',
        message: 'response-phase error: '+err.message,
        error: err
      });
    })

    // Send a (potentially modified) response back to the client.
    .then(function(){
      return transaction.clientSend(outResp);
    })

    .catch(function(err){
      mitm.emit('log',{
        level:'error',
        message:err.message,
        error:err
      });
    });
  });

  this.server.listen(opts.port);

  setTimeout(function(){
    mitm.emit('log',{
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
    if (!this.intercepts.hasOwnProperty(phase)){
      throw new Error(phase ? 'invalid phase '+phase : 'missing phase');
    }
    this.intercepts[phase].push(cb);
  },

  /*
   * Remove all intercepts.
   */
  reset: function(){
    var intercepts = this.intercepts;
    Object.keys(intercepts).forEach(function(phase){
      intercepts[phase].length = 0;
    });
  },

  /*
   * Shut down the proxy server.
   */
  close: function(){
    this.server.close();
  },

  /*
   * Run all phase callbacks set by the above method for the given phase.
   */
  runPhase: function(phase, transaction){
    var req = transaction.request,
      resp = transaction.response;
    var intercepts = this.intercepts[phase];
    var api = new ApiDelegate(transaction);
    return serialize(intercepts, function(intercept, next){
      if (intercept.length >= 3){
        intercept.call(null, transaction.request, transaction.response, next);
      } else {
        intercept.call(null, transaction.request, transaction.response);
        next();
      }
    });
  }
});

var ApiDelegate = Base.extend(function(transaction){
  this.request = transaction.request;
  this.response = transaction.response;
  this._transaction = transaction;
},{});

module.exports = Mitm;




