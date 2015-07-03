/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import chunker from './chunker'
import { Readable } from 'stream'

// ---------------------------

export default class BufferReader extends Readable {

  constructor(buffers) {
    super({})
    this._buffers = buffers
    this._i = 0
    this._keepGoing = true
  }

  get stringable() {
    return true
  }

  toString(encoding) {
    return chunker.chunksToString(this._buffers, encoding)
  }

  setString(str, encoding) {
    let buffers = chunker.stringToChunks(str, encoding)
    this._buffers = buffers
  }

  _read() {
    if (this._i < this._buffers.length) {
      if (this._keepGoing) {
        this._keepGoing = this.push(this._buffers[this._i++])
      } else {
        this._keepGoing = true
      }
    } else {
      this.push(null)
    }
  }

  size() {
    return this._buffers.reduce((tally, buffer) => {
      return tally + buffer.length
    }, 0)
  }
}
