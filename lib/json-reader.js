/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var util = require('util');
var Readable = require('stream').Readable;

// ---------------------------

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

function isArr(o){
  return Array.isArray(o);
}

JsonReader.prototype.setString = function(str){
  var obj = JSON.parse(str);

  if (isArr(obj) ^ isArr(this._obj)){
    // if one is an object and the other is
    // an array, overwrite the object since
    // they're of different types
    this._obj = obj;

  } else if (isArr(obj)) {
    // if both are arrays, reset this object's
    // values to those of the incoming one
    this._obj.length = 0;
    for (var i=0; i<obj.length; i++){
      this._obj[i] = obj[i];
    }

  } else {
    // if both are objects, reset this object's
    // values to those of the incoming one
    Object.keys(this._obj).forEach(function(key){
      delete this._obj[key];
    }, this);
    Object.keys(obj).forEach(function(key){
      this._obj[key] = obj[key];
    }, this);
  }
};

JsonReader.prototype._read = function(){
  if (!this._buffers){
    var body = JSON.stringify(this._obj);
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

module.exports = JsonReader;
