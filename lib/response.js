/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Body = require('./body');
var chunker = require('./chunker');
var streams = require('./streams');
var _ = require('lodash-node');
var cheerio = require('cheerio');

// ---------------------------

var Response = Body.extend(function(){
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

  // -------------------------------------------------

  toString: function(showBody, encoding){
    var result = [];
    result.push(this._data.statusCode);
    var indent = '   ';
    var headers = this._data.headers;
    Object.keys(headers).forEach(function(key){
      result.push(indent+key + ': ' + headers[key]);
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
