/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Body = require('./body');
var chunker = require('./chunker');
var streams = require('./streams');
var _ = require('lodash-node');
var cheerio = require('cheerio');
var url = require('url');
var querystring = require('querystring');

// ---------------------------

/**
 * Represents an HTTP request.
 */
var Request = Body.extend(function(){
  this._data = {};
},{

  setHttpSource: function(inReq, resolver){
    var u = inReq.url;
    if (resolver){
      u = url.resolve(resolver, u);
    }
    var host = (function(){
      var host = inReq.headers.host;
      var result = {};
      if (host){
        var matches = host.match(/^([^:]+)(:([\d]+))?$/);
        if (matches){
          result.name = matches[1];
          var port = parseInt(matches[3]);
          if (port){
            result.port = port;
          }
        }
      }
      return result;
    })();
    var purl = url.parse(u);
    this.headers = inReq.headers;
    this.protocol = purl.protocol;
    this.hostname = purl.hostname || host.name;
    this.port = purl.port || host.port || this.getDefaultPort();
    this.method = inReq.method;
    this.url = purl.path;
    this.source = inReq;
  },

  // -------------------------------------------------

  /**
   * Getter/setter for HTTP protocol, e.g. 'http:'
   */
  get protocol(){
    return this._data.protocol;
  },
  set protocol(protocol){
    this._data.protocol = protocol;
    this._populated = true;
  },

  /**
   * Getter/setter for host name. Does not incude port.
   */
  get hostname(){
    return this._data.hostname;
  },
  set hostname(hostname){
    if (!hostname){
      throw new Error('invalid hostname: '+hostname);
    }
    this._data.hostname = hostname;
    var host = this._data.hostname;
    if (this._data.port){
      host += ':' + this._data.port;
    }
    this._data.headers.host = host;
    this._populated = true;
  },

  /**
   * Getter/setter for port.
   */
  get port(){
    return this._data.port;
  },
  set port(port){
    if (!port){
      this._data.port = undefined;
    } else {
      var parsedPort = parseInt(port);
      if (!parsedPort){
        throw new Error('invalid port: '+port);
      }
      this._data.port = parsedPort;
    }
    var host = this._data.hostname;
    if (this._data.port){
      host += ':' + this._data.port;
    }
    this._data.headers.host = host;
    this._populated = true;
  },

  /**
   * Getter/setter for HTTP method.
   */
  get method(){
    return this._data.method;
  },
  set method(method){
    if (!method){
      throw new Error('invalid method');
    }
    this._data.method = method.toUpperCase();
    this._populated = true;
  },

  /**
   * Getter/setter for URL. Root-relative.
   */
  get url(){
    return this._data.url;
  },
  set url(url){
    if (!/^\//.test(url)){
      throw new Error('invalid url');
    }
    this._data.url = url;
    this._populated = true;
  },

  /**
   * Getter/setter for HTTP request header object.
   */
  get headers(){
    return this._data.headers;
  },
  set headers(headers){
    this._data.headers = _.extend({}, headers);
    this._populated = true;
  },

  // -------------------------------------------------

  isPopulated: function(){
    return this._populated;
  },

  /**
   * Returns the default port given the current protocol.
   */
  getDefaultPort: function(){
    return this.protocol === 'https:' ? 443 : 80;
  },

  /*
   * Prepare this request for sending by removing internal contradictions and
   * HTTP spec violations.
   *
   * TODO: emit debug log events for things that are changed.
   */
  sanitize: function(){
    if (nonEntityMethods.hasOwnProperty(this._data.method)) {
      this._data.source = streams.from([]);
    }
    if (!this._data.source){
      this._data.source = streams.from([]);
    }
    // avoid mucking around figuring out how to set content-length
    // instead, force node to chunk the response
    delete this._data.headers['content-length'];
    this._data.headers['x-intercepted-by'] = 'hoxy';
    Object.keys(this._data.headers).forEach(function(name){
      if (removeHeaders.hasOwnProperty(name)) {
        delete this._data.headers[name];
      }
    }.bind(this));
  }
});

var removeHeaders = {
  'accept-encoding': true,
  'proxy-connection': true,
  'proxy-authorization': true
};

var nonEntityMethods = {
  GET: true,
  HEAD: true,
  TRACE: true
};

module.exports = Request;



