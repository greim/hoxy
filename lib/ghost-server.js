/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var streams = require('./streams');
var Base = require('./base');
var static = require('node-static');
var slugs = require('slugs');
var http = require('http');
var fs = require('fs');

// ---------------------------


module.exports = Base.extend(function(docroot){
  var slug = slugs(docroot);
  this._socketPath = '/tmp/hoxy.'+slug+'.sock';
  var stat = new static.Server(docroot);
  var server = http.createServer(function(req, resp){
    stat.serve(req, resp);
  }).listen(socketPath);
  server.on('error', function(err){
    this.emit('log', {
      level:'error',
      message:'proxy listening on port '+opts.port,
      error: err
    });
  }.bind(this));
},{
  serve: function(opts){
    return await('done')
    .run(function(prom){
      return http.get({
        socketPath: this._socketPath,
        path: opts.url || opts.request.url,
        headers: opts.request.headers || {}
      }, function(inResp){
        if (inResp.statusCode < 400 || opts.includeErrors){
          prom.keep('done', inResp);
        } else {
          prom.keep('done', resp.source);
        }
      });
    }, this);
  }
});
