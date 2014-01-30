/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var _ = require('lodash-node');
var Proxy = require('./lib/proxy');

// ---------------------------

module.exports = {
  Proxy: Proxy,
  // TODO: change this method to create and don't have
  // it start listening automatically.
  start: function(opts){
    opts = _.extend({
      port: 8080 // TODO: test default port
    }, opts);
    return new Proxy(opts);
    if (opts.forever){
      this.forever(); // TODO: test this
    }
  },
  forever: function(handler){
    process.on('uncaughtException', function(err){
      if (typeof handler === 'function'){
        handler(err);
      } else {
        console.log(err.stack);
      }
    });
  }
};
