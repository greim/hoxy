/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var util = require('util');
var Readable = require('stream').Readable;

// ---------------------------

function BufferReader(buffers){
  Readable.call(this, {});
  this._buffers = buffers;
  this._i = 0;
  this._keepGoing = true;
}

util.inherits(BufferReader, Readable);

BufferReader.prototype.stringable = true;

BufferReader.prototype.toString = function(encoding){
  return chunker.chunksToString(this._buffers, encoding);
};

BufferReader.prototype.setString = function(str, encoding){
  var buffers = chunker.stringToChunks(str, encoding);
  this._buffers = buffers;
};

BufferReader.prototype._read = function(){
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

BufferReader.prototype.size = function(){
  return this._buffers.reduce(function(tally, buffer){
    return tally + buffer.length;
  },0);
};

module.exports = BufferReader;
