/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var _ = require('lodash-node');
var Proxy = require('./lib/proxy');

// ---------------------------

module.exports = {
  Proxy: Proxy,
  forever: function(handler, ctx){
    process.on('uncaughtException', function(err){
      if (handler === undefined){
        console.log(err.stack);
      } else if (typeof handler === 'function'){
        handler.call(ctx, err);
      } else if (typeof handler.write === 'function'){
        handler.write(err.stack);
      } else {
        console.log(err.stack);
      }
    });
  }
};
