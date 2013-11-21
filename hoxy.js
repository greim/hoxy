/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Logger = require('./lib/logger');
var Mitm = require('./lib/mitm');
var eventer = require('./lib/eventer');
var _ = require('lodash-node');
var events = require('events');

// ---------------------------

var Hoxy = eventer.extend(function(opts){
  instances.push(this);
  opts = _.extend({
    port: 8080
  }, opts);
  this._mitm = new Mitm(opts);
  this._mitm.on('log', function(item){
    this.emit('log', item);
  }.bind(this));
},{
  intercept: function(phase, cb){
    this._mitm.intercept(phase, cb, this);
  },
  reset: function(){
    this._mitm.reset();
  },
  close: function(){
    this._mitm.close();
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

var instances = [];

process.on('uncaughtException', function(err){
  instances.forEach(function(instance){
    instance.emit('log',{
      level: 'error',
      message: 'uncaught error: '+err.message,
      error: err
    });
  });
});

module.exports = {
  start: function(opts){
    return new Hoxy(opts);
  }
};
