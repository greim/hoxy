/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Logger = require('./lib/logger');
var Mitm = require('./lib/mitm');
var Base = require('./lib/base');
var GhostServer = require('./lib/ghost-server');
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
},{
  intercept: function(phase, cb){
    this._mitm.intercept(phase, cb, this);
  },
  reset: function(){
    this._mitm.reset();
  },
  close: function(){
    this._mitm.close();
    this._ghost && this._ghost.close();
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
  },
  serve: function(opts, cb){
    if (!this._ghost){
      this._ghost = new GhostServer(opts.docroot || process.cwd());
      this._ghost.on('error', function(err){
        this.emit('log', {
          level:'error',
          message:'proxy listening on port '+opts.port,
          error: err
        });
      }.bind(this));
    }
    this._ghost.serve()
    .onkeep(function(got){
      cb();
    })
    .onfail(function(err){
      cb(err);
    });
  }
});

module.exports = {
  start: function(opts){
    return new Hoxy(opts);
  }
};
