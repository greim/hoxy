/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var util = require('util');
var Readable = require('stream').Readable;
var querystring = require('querystring');

// ---------------------------

// TODO: test
function ParamReader(params){
  Readable.call(this, {});
  this._params = params;
  this._i = 0;
  this._keepGoing = true;
}

util.inherits(ParamReader, Readable);

ParamReader.prototype.stringable = true;

ParamReader.prototype.toString = function(){
  return querystring.stringify(this._params);
};

function isArr(o){
  return Array.isArray(o);
}

ParamReader.prototype.setString = function(str){
  var params = querystring.parse(str);
  this._params = params;
};

ParamReader.prototype._read = function(){
  if (!this._buffers){
    var body = querystring.stringify(this._params);
    this._buffers = chunker.stringToChunks(body, 'utf8');
  }
  if (this._i < this._buffers.length){
    if (this._keepGoing){
      this._keepGoing = this.push(this._buffers[this._i++]);
    } else {
      this._keepGoing = true;
    }
  } else {
    this.push(null);
  }
};

module.exports = ParamReader;
