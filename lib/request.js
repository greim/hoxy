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

  /**
   * This method is used internally.
   */
  _setRawData: function(data){
    _.extend(this._data, data);
    if (!Array.isArray(this._data.buffers)){
      this._data.buffers = [];
    }
    this._data.headers = _.extend({}, this._data.headers)
    this._data.method = this._data.method.toUpperCase();
    if (this._data.host){
      this.setHost(this._data.host);
    }
    this._populated = true;
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
      throw new Error('invalid hostname');
    }
    this._data.hostname = hostname;
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
      return;
    }
    port = parseInt(port);
    if (!port){
      throw new Error('invalid port');
    }
    this._data.port = port;
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

  /**
   * Return a string of the form 'hostname:port'. :port may be ommitted if not
   * specified on this request.
   */
  getHost: function(){
    var host = this.hostname;
    if (this.port){
      host += ':' + this.port;
    }
    return host;
  },

  /**
   * Update the hostname and port based on a string of the form
   * 'hostname:port'. If :port is absent, port becomes undefined, allowing the
   * implementation to use whatever default port is associated with the current
   * protocol.
   */
  setHost: function(host){
    var match = (host||'').match(/^([^:]+)(:(\d+))?$/);
    if (!match){
      throw new Error('invalid host');
    }
    this.hostname = match[1];
    var port = parseInt(match[3]) || undefined;
    this.port = port;
  },

  /**
   * Get this request's absolute URL by combining the protocol, hostname, port
   * and url properties.
   */
  getAbsoluteUrl: function(){
    return this.protocol + '//' + this.getHost() + this.url;
  },

  /**
   * Set the protocol, hostname, port and url properties of this request by
   * parsing the given absolute URL.
   */
  setAbsoluteUrl: function(aurl){
    var purl = url.parse(aurl);
    this.protocol = purl.protocol;
    this.hostname = purl.hostname;
    this.port = purl.port;
    this.url = purl.path;
  },

  /**
   * Parse out the pathname of the current URL (everything but the query
   * string). For example if the url is '/pages/page.html?foo=bar' then this
   * method returns '/pages/page.html'.
   */
  getPathname: function(){
    var purl = url.parse(this.url);
    return purl.pathname;
  },

  /**
   * Alter the current URL with the given filepath name. For example if the url is
   * '/pages/page.html?foo=bar' and you set the pathname to '/page.html', then
   * the URL becomes '/page.html?foo=bar'.
   */
  setPathname: function(pathname){
    var aPurl = url.parse(pathname);
    var purl = url.parse(this.url);
    var query = purl.search || ''
    this.url = aPurl.pathname + query;
  },

  /**
   * Parse out the filename of the current URL, or whatever exists beyond the
   * lastmost '/' (sans query string). For example if the url is
   * '/pages/page.html?foo=bar' then this method returns 'page.html'. If the
   * url is '/foo/bar' then this method returns 'bar'. If the url is '/foo/'
   * then this method returns ''.
   */
  getFilename: function(){
    var matches = this.url.match(/\/([^\/]+)$/);
    return matches ? matches[1] : undefined;
  },

  /**
   * Alter the current URL with the given file name. For example if the url is
   * '/pages/page.html?foo=bar' and you set the filename to 'document.html',
   * then the URL becomes '/pages/document.html?foo=bar'.
   */
  setFilename: function(f){
    this.url = this.url.replace(/\/[^\/]+$/, '/'+f);
  },

  /**
   * Parse out the filename extension of the current URL. For example if the
   * url is /pages/page.html?foo=bar then this method returns 'html'. If
   * nothing like a filename extension is found, returns ''.
   */
  getExtension: function(){
    var purl = url.parse(this.url);
    var matches = purl.pathname.match(/\.([^\.\/]+)$/) || [null,''];
    return matches[1];
  },

  /**
   * Alter the current URL to have the given file name extension. If nothing
   * like a filename extension is found, does nothing.
   */
  setExtension: function(ext){
    this.url = this.url.replace(/\.[^\.]+$/, '.'+ext);
  },

  /**
   * Get a parsed version of the absolute URL of this request using node's
   * built in url.parse() function.
   */
  getParsedUrl: function(){
    return url.parse(this.getAbsoluteUrl(), true);
  },

  /**
   * Run a callback on this request's cookies represented as an object.
   */
  cookies: function(cb, ctx){
    var ck = (this.headers.cookie||'');
    var ckObj = querystring.parse(ck, '; ');
    ckObj = cb.call(ctx, ckObj) || ckObj;
    this.headers.cookie = querystring.stringify(ckObj, '; ') || undefined;
  },

  /**
   * Run a callback on this request's url parameters represented as an object.
   */
  urlParams: function(cb, ctx){
    var q = (this.getParsedUrl().query||'');
    q = cb.call(ctx, q) || q;
    var purl = this.getParsedUrl();
    purl.query = q;
    delete purl.path;
    delete purl.href;
    delete purl.search;
    this.setAbsoluteUrl(url.format(purl, true));
  },

  /**
   * Run a callback on this request's body parameters represented as an object.
   */
  bodyParams: function(cb, ctx){
    var bd = this.getBody();
    var bdObj = querystring.parse(bd);
    bdObj = cb.call(ctx, bdObj) || bdObj;
    this.setBody(querystring.stringify(bdObj));
  },

  /**
   * Get/set individual cookies.
   * this.cookie('foo') // gets the value
   * this.cookie('foo','bar') // sets the value
   */
  cookie: function(name, value){
    if (arguments.length <= 1){
      var cookie;
      this.cookies(function(cookies){
        cookie = cookies[name];
      },this);
      return cookie;
    } else {
      this.cookies(function(cookies){
        cookies[name] = value;
      },this);
    }
  },

  /**
   * Get/set individual url params.
   * this.urlParam('foo') // gets the value
   * this.urlParam('foo','bar') // sets the value
   */
  urlParam: function(name, value){
    if (arguments.length <= 1){
      var param;
      this.urlParams(function(params){
        param = params[name];
      },this);
      return param;
    } else {
      this.urlParams(function(params){
        params[name] = value;
      },this);
    }
  },

  /**
   * Get/set individual body params when content-type is form-url-encoded.
   * this.bodyParam('foo') // gets the value
   * this.bodyParam('foo','bar') // sets the value
   */
  bodyParam: function(name, value){
    if (arguments.length <= 1){
      var param;
      this.bodyParams(function(params){
        param = params[name];
      },this);
      return param;
    } else {
      this.bodyParams(function(params){
        params[name] = value;
      },this);
    }
  },

  /**
   * Get/set either body params or url params, depending on the nature of the
   * request.
   * this.param('foo') // gets the value
   * this.param('foo','bar') // sets the value
   */
  param: function(name, value){
    this.method === 'POST' || this.method === 'PUT'
      ? this.bodyParam.apply(this, arguments)
      : this.urlParam.apply(this, arguments);
  },

  /**
   * Get a string representation of this object. Suitable for printing to logs
   * and such.
   */
  toString: function(showBody, encoding){
    var result = [];
    result.push(this._data.method + ' ' + this._data.url);
    var indent = '   ';
    var headers = this._data.headers;
    Object.keys(headers).forEach(function(key){
      result.push(indent+key + ': ' + headers[key]);
    });
    if (showBody && this._data.buffers.length > 0 && !this.isPiped()) {
      result.push('\r\n' + this.getBody(encoding));
    }
    return result.join('\r\n');
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
      this._data.buffers.length = 0;
    }
    if (!this.isPiped() && this._data.buffers.length > 0){
      var size = this._data.buffers.reduce(function(tally, buffer){
        return tally + buffer.length;
      }, 0);
      this._data.headers['content-length'] = size;
    } else {
      delete this._data.headers['content-length'];
    }
    if (!this.isPiped() && this._data.buffers.length === 0){
      delete this._data.headers['content-type'];
    }
    this.headers['host'] = this.host;
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



