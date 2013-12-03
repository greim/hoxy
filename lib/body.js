/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var chunker = require('./chunker');
var streams = require('./streams');
var DomReader = require('./dom-reader');
var JsonReader = require('./json-reader');
var ParamReader = require('./param-reader');
var BufferReader = require('./buffer-reader');
var cheerio = require('cheerio');
var _ = require('lodash-node');
var querystring = require('querystring');

// ---------------------------

var Body = Base.extend(function(){},{

  get _source(){
    return this._data.source;
  },
  set _source(readable){
    this._data.source = readable;
    this._populated = true;
  },

  // ---------------------

  get $(){
    return this._source._$;
  },
  set $($){
    this._source = new DomReader($);
  },

  get json(){
    return this._source._obj;
  },
  set json(obj){
    this._source = new JsonReader(obj);
  },

  get params(){
    return this.source._params;
  },
  set params(params){
    this._source = new ParamReader(params);
  },

  get buffers(){
    return this.source._buffers;
  },
  set buffers(buffers){
    this.source = new BufferReader(buffers);
  },

  get string(){
    if (this._source && this._source.stringable){
      return this._source.toString();
    } else {
      return undefined;
    }
  },
  set string(str){
    this.source = new BufferReader(chunks.stringToChunks(str));
  },

  // ---------------------

  _load: function(callback){
    if (this._source && this._source.stringable){
      setTimeout(callback,0)
    } else {
      streams.collect(this._source)
      .onkeep(function(got){
        this._source = streams.from(got.buffers);
        callback();
      }, this)
      .onfail(function(err){
        callback(err);
      });
    }
  },
  data: function(name, val){
    if (!this._userData){
      this._userData = {};
    }
    if (arguments.length === 1){
      return this._userData[name];
    } else if (arguments.length === 2){
      this._userData[name] = val;
    }
  },
  slow: function(opts){
    this._data.slow = _.extend({
      latency: -1,
      rate:-1
    }, opts);
  },
  _getLatency: function(){
    return this._data.slow ? parseInt(this._data.slow.latency) : -1;
  },
  _getRate: function(){
    return this._data.slow ? parseInt(this._data.slow.rate) : -1;
  }

});

module.exports = Body;
