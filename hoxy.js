/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Logger = require('./lib/logger');
var Mitm = require('./lib/mitm');
var Base = require('./lib/base');
var _ = require('lodash-node');
var events = require('events');

// ---------------------------

var Hoxy = Base.extend(function(opts){
  opts = _.extend({
    port: 8080
  }, opts);
  this._mitm = new Mitm(opts);
  this._mitm.on('log', function(item){
    this.emit('log', item);
  }.bind(this));
  this._ghosts = {};
},{
  intercept: function(phase, cb){
    this._mitm.intercept(phase, cb);
  },
  reset: function(){
    this._mitm.reset();
  },
  close: function(){
    this._mitm.close();
    Object.keys(this._ghosts).forEach(function(key){
      this._ghosts[key].close();
    }.bind(this));
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

module.exports = {
  start: function(opts){
    return new Hoxy(opts);
  }
};
