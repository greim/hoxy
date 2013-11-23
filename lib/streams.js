/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var await = require('await');
var brake = require('brake');
var util = require('util');
var Readable = require('stream').Readable;

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

BufferReader.prototype.toString = function(encoding){
  return chunker.chunksToString(this._buffers, encoding);
};

BufferReader.prototype.size = function(){
  return this._buffers.reduce(function(tally, buffer){
    return tally + buffer.length;
  },0);
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
  brake: brake,
  /*
   * Get a series of buffers from a stream.
   */
  collect: function(readable){
    return await('buffers')
    .run(function(prom){
      var buffers = [];
      readable.on('error', function(err){
        prom.fail(err);
      });
      readable.on('data', function(buffer){
        buffers.push(buffer);
      });
      readable.on('end', function(){
        prom.keep('buffers', buffers);
      });
    });
  },
  BufferReader: BufferReader
};









