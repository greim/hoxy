/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Logger = require('./lib/logger');
var Proxy = require('./lib/mitm');
var Base = require('./lib/base');
var StreamBrake = require('./lib/stream-brake');
var _ = require('lodash-node');
var events = require('events');

// ---------------------------

module.exports = {
  start: function(opts){
    opts = _.extend({
      port: 8080
    }, opts);
    return new Proxy(opts);
  },
  forever: function(cb){
    process.on('uncaughtException', function(err){
      if (typeof cb === 'function'){
        cb(err);
      } else {
        console.log(err.stack);
      }
    });
  }
};
