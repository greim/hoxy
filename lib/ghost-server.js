/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var streams = require('./streams');
var Base = require('./base');
var static = require('node-static');
var await = require('await');
var _ = require('lodash-node');
var slugs = require('slugs');
var http = require('http');

// ---------------------------


module.exports = Base.extend(function(docroot){
  var slug = slugs(docroot);
  this._socketPath = '/tmp/hoxy.'+slug+'.sock';
  var stat = new static.Server(docroot);
  this._server = http.createServer(function(req, resp){
    stat.serve(req, resp);
  }).listen(this._socketPath);
  this._server.on('error', function(err){
    this.emit('log', {
      level:'error',
      message:'ghost server error: '+err.message,
      error: err
    });
  }.bind(this));
},{
  serve: function(opts){
    return await('response')
    .run(function(prom){
      http.get({
        socketPath: this._socketPath,
        path: opts.url || opts.request.url,
        headers: (opts.request && opts.request.headers) || {}
      }, function(inResp){
        prom.keep('response', inResp);
      });
    }, this);
  },
  close: function(){
    console.log('close')
    this._server.close();
  }
});
