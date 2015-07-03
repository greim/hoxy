/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import { Transform } from 'stream'

function tally(tally2, chunk) {
  return tally2 + chunk.length
}

// ---------------------------

/**
 * A throughput rate-limiting transform stream using backpressure.
 * Transfers <amount> bytes per every <period> milliseconds.
 */

class Chunkifier {

  constructor(capacity) {
    this._buffers = []
    this._capacity = capacity
  }

  size() {
    return this._buffers.reduce(tally, 0)
  }

  getSome() {
    if (this.size() < this._capacity) {
      return null
    }
    let buf = new Buffer(this._capacity)
    let filled = 0
    while (filled < this._capacity) {
      let next = this._buffers[0]
        , amount
      if (next.length > this._capacity - filled) {
        // copy some of it, replace it with slice of itself
        amount = this._capacity - filled
        this._buffers[0] = next.slice(amount, next.length)
      } else {
        // copy all of it, remove it
        amount = next.length
        this._buffers.shift()
      }
      next.copy(buf, filled, 0, amount)
      filled += amount
    }
    return buf
  }

  getRest() {
    let size = this.size()
    if (size === 0) {
      return null
    }
    let buf = new Buffer(size)
    let filled = 0
    for (let i = 0; i < this._buffers.length; i++) {
      let next = this._buffers[i]
      next.copy(buf, filled)
      filled += next.length
    }
    return buf
  }

  add(chunk) {
    this._buffers.push(chunk)
  }
}

export default class StreamBrake extends Transform {

  constructor(amount, period) {
    super()
    this._period = period || 1000
    this._amount = amount || 1024
    this._chunkifier = new Chunkifier(this._amount)
    this._transferred = 0
  }

  timeUntilNext(chunk, now) {
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
    let targetRate = this._amount / this._period
    let amountTransferred = this._transferred + chunk.length
    let time = amountTransferred / targetRate
    let elapsed = now - this._started
    return Math.round(Math.max(0, time - elapsed))
  }

  _transform(chunk, encoding, callback) {
    let self = this
    self._chunkifier.add(chunk)
    ; (function next(now) {
      let nextChunk = self._chunkifier.getSome()
      if (!nextChunk) {
        callback()
      } else {
        let wait
        if (self._started) {
          wait = self.timeUntilNext(nextChunk, now)
        } else {
          self._started = now
          wait = self._period
        }

        setTimeout(() => {
          let now2 = Date.now()
          self.push(nextChunk)
          self._transferred += nextChunk.length
          next(now2)
        }, wait)
      }
    })(Date.now())
  }

  _flush(callback) {
    let self = this
    let lastChunk = self._chunkifier.getRest()
    if (!lastChunk) {
      callback()
    } else {

      let now = Date.now()
        , wait
      if (self._started) {
        wait = self.timeUntilNext(lastChunk, now)
      } else {
        self._started = now
        wait = Math.round(self._period * (lastChunk.length / self._amount))
      }

      setTimeout(() => {
        self.push(lastChunk)
        callback()
      }, wait)
    }
  }
}

