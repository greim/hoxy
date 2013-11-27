/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var util = require('util');
var Transform = require('stream').Transform;

// ---------------------------

function StreamBrake(amount, period){
  Transform.call(this);
  this._period = period || 1000;
  this._origPeriod = this._period;
  this._amount = amount || 1024;
  this._chunkifier = new Chunkifier(this._amount);
  this._lastPush = Date.now();
  this._transferred = 0;
}

util.inherits(StreamBrake, Transform);

StreamBrake.prototype._transform = function(chunk, encoding, callback){
  var self = this;
  self._chunkifier.add(chunk);
  (function next(now){
    var nextChunk = self._chunkifier.getSome();
    if (!nextChunk){
      callback();
    } else {

      if (self._started){
        /*
         * Schedule the next push at future time such that the actual transfer
         * rate will match the desired transfer rate as closely as possible. To
         * do that we need to calculate the proper amount of elapsed time by
         * solving for that variable.
         * 
         * actualRate === targetRate
         * actualRate === amountTransferred / elapsedTime
         * amountTransferred / elapsedTime === targetRate
         * amountTransferred === targetRate * elapsedTime
         * amountTransferred / targetRate === elapsedTime <--
         */
        var targetRate = self._amount / self._period;
        var amountTransferred = self._transferred + nextChunk.length;
        var elapsedTime = amountTransferred / targetRate;
        var elapsed = now - self._started;
        var wait = Math.round(Math.max(0, elapsedTime - elapsed));
      } else {
        self._started = now;
        var wait = self._period;
      }

      setTimeout(function(){
        var now = Date.now()
        self.push(nextChunk);
        self._lastPush = now;
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
    var elapsed = now - self._lastPush;
    var period = Math.round(period * (lastChunk.length / self._amount));
    var remaining = Math.max(0, period - elapsed);
    setTimeout(function(){
      self.push(lastChunk);
      self._lastPush = Date.now();
      callback();
    }, remaining);
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
  hasSome: function(){
    return this.size() >= this._capacity;
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
