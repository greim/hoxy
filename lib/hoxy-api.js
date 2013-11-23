/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var GhostServer = require('./ghost-server');
var path = require('path');

// ---------------------------

var API = function(transaction){
  this.request = transaction._request;
  this.response = transaction._response;
};

var statics = {};

function getServer(docroot){
  docroot = path.resolve(process.cwd(), docroot||'');
  var ghost = statics[docroot];
  if (!ghost){
    ghost = statics[docroot] = new GhostServer(docroot);
  }
  return ghost;
}

function getArgs(args){
  var args = Array.prototype.slice.call(args);
  if (args.length === 3){
    var url = args.shift();
  }
  var docroot = args.shift();
  var callback = args.shift();
  return {
    url: url,
    docroot: docroot,
    callback: callback
  };
}

API.prototype = {
  serve: function(/* [url], docroot, callback */){
    var args = getArgs(arguments);
    var ghost = getServer(args.docroot);
    ghost.serve({
      request: this.request,
      response: this.response,
      url: args.url || this.request.url
    })
    .onkeep(function(got){
      this.response.setHttpSource(got.response);
      args.callback.call(this);
    },this)
    .onfail(function(err){
      args.callback.call(this, err);
    });
  },
  ghostServe: function(/* [url], docroot, callback */){
    var args = getArgs(arguments);
    var ghost = getServer(args.docroot);
    ghost.serve({
      request: this.request,
      response: this.response,
      url: args.url || this.request.url
    })
    .onkeep(function(got){
      if (got.response.statusCode < 400){
        this.response.setHttpSource(got.response);
      }
      args.callback.call(this);
    },this)
    .onfail(function(err){
      args.callback.call(this, err);
    });
  }
};

module.exports = API;
