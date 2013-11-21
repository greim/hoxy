/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var chunker = require('./chunker');
var streams = require('./streams');
var cheerio = require('cheerio');

// ---------------------------

var Body = Base.extend(function(){},{

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

  get buffers(){
    if (this.isPiped()){
      this.emit('log',{
        level:'warn',
        message:'attempt to access entity body of a piped request or response'
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
        message:'attempt to set entity body of a piped request or response'
      });
    } else if (this._data.stream){
      this.emit('log',{
        level:'warn',
        message:'attempt to set entity body of an in-progress request or response'
      });
    }
    this._data.buffers = buffers;
    this._populated = true;
  },

  // -------------------------------------------------

  getContentType: function(){
    var contentType = this.headers['content-type']||'';
    var match = contentType.match(/^([^;]+)/);
    return match ? match[1] : undefined;
  },

  setContentType: function(ct){
    var charset = this.getCharset();
    this.headers['content-type'] = ct + '; charset=' + charset;
  },

  getCharset: function(){
    var contentType = this.headers['content-type']||'';
    var match = contentType.match(/;\s*charset=(.+)$/);
    return match ? match[1] : undefined;
  },

  setCharset: function(charset){
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

  dom: function(cb, ctx){
    var $ = cheerio.load(this.getBody());
    $ = cb.call(ctx, $) || $;
    this.setBody($.html());
  },

  json: function(cb, ctx){
    var obj = JSON.parse(this.getBody());
    obj = cb.call(ctx, obj) || obj;
    this.setBody(JSON.stringify(obj));
  },

  /**
   * 
   */
  isPopulated: function(){
    return !!this._populated;
  }
});

module.exports = Body;
