/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var GhostServer = require('./ghost-server');
var Body = require('./body');
var path = require('path');

// ---------------------------

var Cycle = function(transaction){
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
  var docroot = args.shift();
  if (args.length >= 2){
    var url = args.shift();
  }
  var callback = args.shift();
  return {
    url: url,
    docroot: docroot,
    callback: callback
  };
}

function serve(args, api){
  var ghost = getServer(args.docroot);
  ghost.serve({
    request: api.request,
    response: api.response,
    url: args.url || api.request.url
  })
  .onkeep(function(got){
    if (got.response.statusCode < 400 || args.includeErrors){
      api.response.setHttpSource(got.response);
    }
    args.callback.call(null);
  },api)
  .onfail(function(err){
    args.callback.call(null, err);
  });
}

Cycle.prototype = {

  data: Body.prototype.data,

  /**
   * Provision the response from the local disk. Effectively replaces a remote
   * docroot with a local one. In other words, the client will see a 404 if
   * a file isn't found locally, even if it would have been found remotely.
   * 
   * @param {string} docroot - Local folder to serve from.
   * @param {string} url - (optional) File to serve. Defaults to url of the current request.
   * @param {function} callback - Called upon completion. Passed any error that occurred.
   * 
   * Examples:
   * 
   * // replace remote css with your own
   * proxy.intercept('request', function(req, resp, done){
   *   if (req.url.indexOf('/css/' === 0){
   *     this.serve('/Users/m123/css', done);
   *   }
   * });
   */
  serve: function(/* docroot, [url], callback */){
    var args = getArgs(arguments);
    args.includeErrors = true;
    serve(args, this);
  },

  /**
   * Provision the response from the local disk. Effectively overlays a local
   * docroot over a remote one. In other words, the client won't see a 404 if
   * a file isn't found locally. Instead, ghost() will fail silently and the
   * client will see through to the remote docroot.
   * 
   * @param {string} docroot - Local folder to serve from.
   * @param {string} url - (optional) File to serve. Defaults to url of the current request.
   * @param {function} callback - Called upon completion. Passed any error that occurred.
   * 
   * Examples:
   * 
   * // replace remote css with your own
   * proxy.intercept('request', function(req, resp, done){
   *   if (req.url.indexOf('/css/' === 0){
   *     this.serve('/Users/m123/css', done);
   *   }
   * });
   */
  ghost: function(/* docroot, [url], callback */){
    var args = getArgs(arguments);
    args.includeErrors = false;
    serve(args, this);
  }
};

module.exports = Cycle;
