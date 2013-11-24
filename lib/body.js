/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var chunker = require('./chunker');
var streams = require('./streams');
var cheerio = require('cheerio');
var _ = require('lodash-node');

// ---------------------------

var Body = Base.extend(function(){},{

  get source(){
    return this._data.source;
  },
  set source(readable){
    this._data.source = readable;
    this._populated = true;
  },
  setBody: function(body, encoding){
    var source = streams.from(chunker.stringToChunks(body, encoding));
    this.source = source;
    this.headers['content-length'] = source.size();
    this._populated = true;
  },
  getBody: function(encoding){
    if (!(this.source instanceof streams.BufferReader)){
      throw new Error('entity body not loaded');
    }
    return this.source.toString(encoding);
  },
  load: function(callback){
    if (this.source instanceof streams.BufferReader){
      setTimeout(callback,0)
    } else {
      streams.collect(this.source)
      .onkeep(function(got){
        this.source = streams.from(got.buffers);
        callback();
      }, this)
      .onfail(function(err){
        callback(err);
      });
    }
  },
  slow: function(opts){
    this._data.slow = _.extend({
      latency: -1,
      rate:-1
    }, opts);
  },
  getLatency: function(){
    return this._data.slow ? parseInt(this._data.slow.latency) : -1;
  },
  getRate: function(){
    return this._data.slow ? parseInt(this._data.slow.rate) : -1;
  }

});

module.exports = Body;
