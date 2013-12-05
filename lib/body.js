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

// -------------------------------------------------

var Body = Base.extend(function(){},{

  // TODO: test get and set for all five
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
    return this._source._params;
  },
  set params(params){
    this._source = new ParamReader(params);
  },

  get buffers(){
    return this._source._buffers;
  },
  set buffers(buffers){
    this._source = new BufferReader(buffers);
  },

  get string(){
    if (this._source && this._source.stringable){
      return this._source.toString();
    } else {
      return undefined;
    }
  },
  set string(str){
    this._source = new BufferReader(chunker.stringToChunks(str));
  },

  // -------------------------------------------------

  get _source(){
    return this._getRawDataItem('source');
  },
  set _source(readable){
    this._setRawDataItem('source', readable);
  },

  // -------------------------------------------------

  data: function(name, val){
    if (!this._userData){
      this._userData = {};
    }
    if (arguments.length === 2){
      this._userData[name] = val;
    }
    return this._userData[name];
  },

  slow: function(opts){
    if (opts){
      this._setRawDataItem('slow', {
        latency: parseInt(opts.latency) || -1,
        rate: parseInt(opts.rate) || -1
      });
    }
    return this._getRawDataItem('slow');
  },

  // -------------------------------------------------

  _setRawDataItem: function(name, value){
    if (this._phase === 'sent' || this._phase === 'received'){
      var message = 'requests and responses are not writable during the '+this._phase+' phase';
      this.trigger('log', {
        level: 'error',
        message: message,
        error: new Error(message)
      });
      return;
    }
    this._data[name] = value;
    this._populated = true;
  },

  _getRawDataItem: function(name){
    return this._data[name];
  },

  _load: function(callback, ctx){
    if (ctx){
      callback = callback.bind(ctx);
    }
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
  }
});

module.exports = Body;
