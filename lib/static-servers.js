/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var static = require('node-static');
var await = require('await');
var slugs = require('slugs');
var http = require('http');
var os = require('os');
var fs = require('fs');

// ---------------------------

var tmpdir = os.tmpdir();
if (/\/$/.test(tmpdir)){
  tmpdir = tmpdir.substring(0, tmpdir.length - 1);
}

// TODO: fix sockets
var StaticServer = Base.extend(function(docroot){
  var slug = slugs(docroot);
  this._socketPath = tmpdir+'/hoxy.'+slug+'.sock';
  var stat = new static.Server(docroot);
  this._server = http.createServer(function(req, resp){
    stat.serve(req, resp);
  });
  this._server.on('error', function(err){
    this.emit('log', {
      level:'error',
      message:'ghost server error: '+err.message,
      error: err
    });
  }.bind(this));
  this._initProm = await('init')
  .run(function(prom){
    fs.exists(this._socketPath, function(exists){
      if (exists){
        fs.unlink(this._socketPath, prom.nodify('init'));
      } else {
        this._initProm.keep('init');
      }
    }.bind(this));
  }, this);
},{
  listen: function(){
    this._server.listen(this._socketPath);
  },
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
    this._server.close();
  }
});

var servers = {};

module.exports = {
  promiseServer: function(docroot){
    return await('server')
    .run(function(prom){
      var server = servers[docroot];
      if (!server){
        server = servers[docroot] = new StaticServer(docroot);
        server._initProm
        .onfail(prom.fail, prom)
        .onkeep(function(got){
          server.listen();
          prom.keep('server', server);
        });
      } else {
        prom.keep('server', server);
      }
    });
  }
};
