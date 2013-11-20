/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var eventer = require('./eventer');
var chunker = require('./chunker');
var streams = require('./streams');
var _ = require('lodash-node');
var cheerio = require('cheerio');
var url = require('url');
var querystring = require('querystring');

// ---------------------------

var Request = eventer.extend(function(){
  this._data = {};
},{

  setRawData: function(data){
    _.extend(this._data, data);
    if (!Array.isArray(this._data.buffers)){
      this._data.buffers = [];
    }
    this._data.headers = _.extend({}, this._data.headers)
    this._data.method = this._data.method.toUpperCase();
  },

  pipe: function(){
    this._data.piped = true;
  },

  isPiped: function(){
    return this._data.piped;
  },

  setReadableStream: function(stream){
    this._data.stream = stream;
  },

  getReadableStream: function(){
    if (!this._data.stream){
      this._data.stream = streams.from(this._data.buffers);
    }
    return this._data.stream;
  },

  // -------------------------------------------------

  get protocol(){
    return this._data.protocol;
  },

  set protocol(protocol){
    this._data.protocol = protocol;
  },

  get hostname(){
    return this._data.hostname;
  },

  set hostname(hostname){
    if (!hostname){
      throw new Error('invalid hostname');
    }
    this._data.hostname = hostname;
  },

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
  },

  get method(){
    return this._data.method;
  },

  set method(method){
    if (!method){
      throw new Error('invalid method');
    }
    this._data.method = method.toUpperCase();
  },

  get url(){
    return this._data.url;
  },

  set url(url){
    if (!/^\//.test(url)){
      throw new Error('invalid url');
    }
    this._data.url = url;
  },

  get headers(){
    return this._data.headers;
  },

  set headers(headers){
    this._data.headers = _.extend({}, headers);
  },

  get buffers(){
    if (this.isPiped()){
      this.emit('log',{
        level:'warn',
        message:'attempt to access entity body of a piped request'
      });
    }
    return this._data.buffers;
  },

  set buffers(buffers){
    if (!Array.isArray(buffers)){
      throw new Error('attempt to set buffers to non-array');
    }
    if (this.isPiped()){
      this.emit('log',{
        level:'warn',
        message:'attempt to set entity body of a piped request'
      });
    } else if (this._data.stream){
      this.emit('log',{
        level:'warn',
        message:'attempt to set entity body of an in-progress request'
      });
    }
    this._data.buffers = buffers.slice();
  },

  // -------------------------------------------------

  getHost: function(){
    var host = this.hostname;
    if (this.port){
      host += ':' + this.port;
    }
    return host;
  },

  setHost: function(host){
    var match = (host||'').match(/^([^:]+)(:(\d+))?$/);
    if (!match){
      throw new Error('invalid host');
    }
    this.hostname = match[1];
    var port = parseInt(match[3]) || undefined;
    this.port = port;
  },

  getAbsUrl: function(){
    return this.protocol + '//' + this.getHost() + this.url;
  },

  setAbsUrl: function(aurl){
    var purl = url.parse(aurl);
    this.protocol = purl.protocol;
    this.hostname = purl.hostname;
    this.port = purl.port;
    this.url = purl.path;
  },

  getFilename: function(){
    var matches = this.url.match(/\/([^\/]+)$/);
    return matches ? matches[1] : undefined;
  },

  setFilename: function(f){
    this.url = this.url.replace(/\/[^\/]+$/, '/'+f);
  },

  getExtension: function(){
    var matches = this.url.match(/\.([^\.]+)$/);
    return matches ? matches[1] : undefined;
  },

  setExtension: function(ext){
    this.url = this.url.replace(/\.[^\.]+$/, '.'+ext);
  },

  getOrigin: function(){
    return this.headers.origin;
  },

  setOrigin: function(origin){
    this.headers.origin = origin || undefined;
  },

  getReferrer: function(){
    return this.headers.referer || this.headers.referrer;
  },

  setReferrer: function(ref){
    this.headers.referer = ref || undefined;
  },

  getContentType: function(){
    var contentType = this.headers['content-type']||'';
    var match = contentType.match(/^([^;]+)/);
    return match ? match[1] : undefined;
  },

  setContentType: function(ct){
    var charset = this.getEncoding();
    this.headers['content-type'] = ct + '; charset=' + charset;
  },

  // TODO: change to getCharset()
  getEncoding: function(){
    var contentType = this.headers['content-type']||'';
    var match = contentType.match(/;\s*charset=(.+)$/);
    return match ? match[1] : undefined;
  },

  // TODO: change to setCharset()
  setEncoding: function(charset){
    var ct = this.getContentType();
    this.headers['content-type'] = ct + '; charset=' + charset;
  },

  // get body with explicit encoding
  getBody: function(encoding){
    return chunker.chunksToString(this.buffers, encoding);
  },

  // set body with explicit encoding
  setBody: function(body, encoding){
    this.buffers = chunker.stringToChunks(body, encoding);
  },

  getJson: function(){
    return JSON.parse(this.body);
  },

  setJson: function(obj){
    this.body = JSON.stringify(obj);
  },

  // no corresponding setter, too many weird corner cases
  getParsedUrl: function(){
    return url.parse(this.getAbsUrl(), true);
  },

  getCookies: function(){
    var ck = (this.headers.cookie||'');
    return querystring.parse(ck, '; ');
  },

  setCookies: function(cookies){
    this.headers.cookie = querystring.stringify(cookies, '; ') || undefined;
  },

  getUrlParams: function(){
    var q = (this.getParsedUrl().query||'');
    return q;
  },

  setUrlParams: function(params){
    var purl = this.getParsedUrl();
    purl.query = params;
    delete purl.path;
    delete purl.href;
    delete purl.search;
    this.setAbsUrl(url.format(purl, true));
  },

  getDom: function(){
    var bd = this.getBody();
    return cheerio.load(bd);
  },

  setDom: function($){
    this.setBody($.html());
  },

  getBodyParams: function(){
    var bd = this.getBody();
    return querystring.parse(bd);
  },

  setBodyParams: function(params){
    this.setBody(querystring.stringify(params));
  },

  cookie: function(name, value){
    var cookies = this.getCookies();
    if (arguments.length === 1){
      return cookies[name];
    } else {
      cookies[name] = value;
      this.setCookies(cookies);
    }
  },

  urlParam: function(name, value){
    var params = this.getUrlParams();
    if (arguments.length === 1){
      return params[name];
    } else {
      params[name] = value;
      this.setUrlParams(params);
    }
  },

  bodyParam: function(name, value){
    var params = this.getBodyParams();
    if (arguments.length === 1){
      return params[name];
    } else {
      params[name] = value;
      this.setBodyParams(params);
    }
  },

  param: function(name, value){
    this.method === 'POST'
      ? this.bodyParam.apply(this, arguments)
      : this.urlParam.apply(this, arguments);
  },

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



