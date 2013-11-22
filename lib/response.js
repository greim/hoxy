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

/**
 * Represents an HTTP response.
 */
var Response = Body.extend(function(){
  this._data = {
    statusCode: 200,
    headers: {},
    source: streams.from([])
  };
},{

  setHttpSource: function(inResp){
    this.statusCode = inResp.statusCode;
    this.headers = inResp.headers;
    this.source = inResp;
  },


  // -------------------------------------------------

  /**
   * Getter/setter for HTTP status code.
   */
  get statusCode(){
    return this._data.statusCode;
  },
  set statusCode(code){
    code = parseInt(code);
    if (!code) { throw new Error('invalid status code'); }
    this._data.statusCode = code;
    this._populated = true;
  },

  /**
   * Getter/setter for HTTP response header object.
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

  /*
   * Prepare this response for sending by removing internal contradictions and
   * otherwise shoring up any HTTP spec violations.
   *
   * TODO: emit debug log events for things that are changed.
   */
  sanitize: function(){
    var size;
    if (typeof this._data.source.size === 'function'){
      size = this._data.source.size();
    }
    if (size){
      this._data.headers['content-length'] = size;
    } else {
      delete this._data.headers['content-length'];
    }
    this._data.headers['x-intercepted-by'] = 'hoxy';
  }
});

module.exports = Response;
