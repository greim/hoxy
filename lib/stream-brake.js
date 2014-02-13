/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var util = require('util');
var Transform = require('stream').Transform;

// ---------------------------

/**
 * A throughput rate-limiting transform stream using backpressure.
 * Transfers <amount> bytes per every <period> milliseconds.
 */

function StreamBrake(amount, period){
  Transform.call(this);
  this._period = period || 1000;
  this._amount = amount || 1024;
  this._chunkifier = new Chunkifier(this._amount);
  this._transferred = 0;
}

util.inherits(StreamBrake, Transform);

StreamBrake.prototype.timeUntilNext = function(chunk, now){
  /*
   * Determine when to schedule the push of the given chunk such that the
   * transfer of this stream will match the desired transfer rate as closely as
   * possible. To do that we need to calculate the proper amount of elapsed
   * time by solving for that variable.
   * 
   * actualRate === targetRate
   * actualRate === amountTransferred / time
   * amountTransferred / time === targetRate
   * amountTransferred === targetRate * time
   * amountTransferred / targetRate === time <--
   */
  var targetRate = this._amount / this._period;
  var amountTransferred = this._transferred + chunk.length;
  var time = amountTransferred / targetRate;
  var elapsed = now - this._started;
  return Math.round(Math.max(0, time - elapsed));
};

StreamBrake.prototype._transform = function(chunk, encoding, callback){
  var self = this;
  self._chunkifier.add(chunk);
  (function next(now){
    var nextChunk = self._chunkifier.getSome();
    if (!nextChunk){
      callback();
    } else {

      if (self._started){
        wait = self.timeUntilNext(nextChunk, now);
      } else {
        self._started = now;
        var wait = self._period;
      }

      setTimeout(function(){
        var now = Date.now()
        self.push(nextChunk);
        self._transferred += nextChunk.length;
        next(now);
      }, wait);
    }
  })(Date.now());
};

StreamBrake.prototype._flush = function(callback){
  var self = this;
  var lastChunk = self._chunkifier.getRest();
  if (!lastChunk){
    callback();
  } else {

    var now = Date.now();
    if (self._started){
      var wait = self.timeUntilNext(lastChunk, now);
    } else {
      self._started = now;
      var wait = Math.round(self._period * (lastChunk.length / self._amount));
    }

    setTimeout(function(){
      self.push(lastChunk);
      callback();
    }, wait);
  }
};

function Chunkifier(capacity){
  this._buffers = [];
  this._capacity = capacity;
}

function tally(tally, chunk){
  return tally + chunk.length;
}

Chunkifier.prototype = {
  size: function(){
    return this._buffers.reduce(tally, 0);
  },
  getSome: function(){
    if (this.size() < this._capacity){
      return null;
    }
    var buf = new Buffer(this._capacity);
    var filled = 0;
    while (filled < this._capacity){
      var next = this._buffers[0];
      if (next.length > this._capacity - filled){
        // copy some of it, replace it with slice of itself
        var amount = this._capacity - filled;
        this._buffers[0] = next.slice(amount, next.length);
      } else {
        // copy all of it, remove it
        var amount = next.length;
        this._buffers.shift();
      }
      next.copy(buf, filled, 0, amount);
      filled += amount;
    }
    return buf;
  },
  getRest: function(){
    var size = this.size();
    if (size === 0){
      return null;
    }
    var buf = new Buffer(size);
    var filled = 0;
    for (var i=0; i<this._buffers.length; i++){
      var next = this._buffers[i];
      next.copy(buf, filled);
      filled += next.length;
    }
    return buf;
  },
  add: function(chunk){
    this._buffers.push(chunk);
  }
};

module.exports = StreamBrake;
