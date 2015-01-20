/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var util = require('util');
var Readable = require('stream').Readable;

// ---------------------------

// TODO: test
function JsonReader(obj){
  Readable.call(this, {});
  this._obj = obj;
  this._i = 0;
  this._keepGoing = true;
}

util.inherits(JsonReader, Readable);

JsonReader.prototype.stringable = true;

JsonReader.prototype.toString = function(){
  return JSON.stringify(this._obj);
};

JsonReader.prototype.finalize = function(){
  var body = this.toString();
  this._buffers = chunker.stringToChunks(body, 'utf8');
};

function isArr(o){
  return Array.isArray(o);
}

JsonReader.prototype.setString = function(str){
  var obj = JSON.parse(str);
  this._obj = obj;
};

JsonReader.prototype._read = function(){
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

JsonReader.prototype.size = function(){
  return this._buffers.reduce(function(tally, buffer){
    return tally + buffer.length;
  },0);
};

module.exports = JsonReader;
