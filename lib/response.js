/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var eventer = require('./eventer');
var chunker = require('./chunker');
var streams = require('./streams');
var _ = require('lodash-node');
var cheerio = require('cheerio');

// ---------------------------

var Response = eventer.extend(function(){
  this._data = {
    statusCode: 200,
    headers: {}
  };
},{

  setRawData: function(data){
    _.extend(this._data, data);
    if (!Array.isArray(this._data.buffers)){
      this._data.buffers = [];
    }
    this._data.headers = _.extend({}, this._data.headers)
    this._populated = true;
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
      this._data.stream = streams.createReadable(this._data.buffers);
    }
    return this._data.stream;
  },

  // -------------------------------------------------

  get statusCode(){
    return this._data.statusCode;
  },

  set statusCode(code){
    code = parseInt(code);
    if (!code) { throw new Error('invalid status code'); }
    this._data.statusCode = code;
    this._populated = true;
  },

  get headers(){
    return this._data.headers;
  },

  set headers(headers){
    this._data.headers = _.extend({}, headers);
    this._populated = true;
  },

  get buffers(){
    if (this.isPiped()){
      this.emit('log',{
        level:'warn',
        message:'attempt to access entity body of a piped response'
      });
    }
    return this._data.buffers;
  },

  set buffers(buffers){
    if (!Array.isArray(buffers)) {
      throw new Error('attempt to set buffers to non-array');
    }
    if (this.isPiped()){
      this.emit('log',{
        level:'warn',
        message:'attempt to set entity body of a piped response'
      });
    } else if (this._data.stream){
      this.emit('log',{
        level:'warn',
        message:'attempt to set entity body of an in-progress response'
      });
    }
    this._data.buffers = buffers.slice();
    this._populated = true;
  },

  // -------------------------------------------------

  get contentType(){
    var contentType = this.headers['content-type']||'';
    var match = contentType.match(/^([^;]+)/);
    return match ? match[1] : undefined;
  },

  set contentType(ct){
    var charset = this.encoding;
    this.headers['content-type'] = ct + '; charset=' + charset;
  },

  get encoding(){
    var contentType = this.headers['content-type']||'';
    var match = contentType.match(/;\s*charset=(.+)$/);
    return match ? match[1] : undefined;
  },

  set encoding(charset){
    var ct = this.contentType;
    this.headers['content-type'] = ct + '; charset=' + charset;
  },

  get body(){
    return chunker.chunksToString(this.buffers, 'utf8');
  },

  set body(body){
    this.buffers = chunker.stringToChunks(body, 'utf8');
  },

  get json(){
    return JSON.parse(chunker.chunksToString(this.buffers, 'utf8'));
  },

  set json(obj){
    this.buffers = chunker.stringToChunks(JSON.stringify(obj), 'utf8');
  },

  // -------------------------------------------------

  // get body with explicit encoding
  getBody: function(encoding){
    return chunker.chunksToString(this.buffers, encoding);
  },

  // set body with explicit encoding
  setBody: function(body, encoding){
    this.buffers = chunker.stringToChunks(body, encoding);
  },

  getDom: function(){
    return cheerio.load(this.body);
  },

  setDom: function($){
    this.body = $.html();
  },

  toString: function(showBody, encoding){
    var result = [];
    result.push(this.statusCode);
    var indent = '   ';
    Object.keys(this.headers).forEach(function(key){
      result.push(indent+key + ': ' + this.headers[key]);
    }.bind(this));
    if (showBody && this._data.buffers.length > 0 && !this.isPiped()) {
      result.push('\r\n' + this.getBody(encoding));
    }
    return result.join('\r\n');
  },

  isPopulated: function(){
    return !!this._populated;
  },

  /*
   * Prepare this response for sending by removing internal contradictions and
   * HTTP spec violations.
   *
   * TODO: emit debug log events for things that are changed.
   */
  sanitize: function(){
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
    this._data.headers['x-intercepted-by'] = 'hoxy';
  }
});

module.exports = Response;
