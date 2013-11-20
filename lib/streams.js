/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var brake = require('brake');
var Readable = require('stream').Readable;
var util = require('util');

// ---------------------------

/*
 * Utilities for streams.
 */

function BufferReader(buffers){
  Readable.call(this, {});
  this._buffers = buffers;
  this._i = 0;
  this._keepGoing = true;
}

util.inherits(BufferReader, Readable);

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

module.exports = {
  /*
   * Wrap an array of buffers as a readable stream.
   */
  from: function(buffers){
    return new BufferReader(buffers);
  },
  /*
   * Create a transform stream that simply slows the throughput.
   */
  brake: brake
};









