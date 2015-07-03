/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import chunker from './chunker'
import { Readable } from 'stream'

// ---------------------------

// TODO: test
export default class JsonReader extends Readable {

  constructor(obj) {
    super({})
    this._obj = obj
    this._i = 0
    this._keepGoing = true
  }

  get stringable() {
    return true
  }

  toString() {
    return JSON.stringify(this._obj)
  }

  finalize() {
    let body = this.toString()
    this._buffers = chunker.stringToChunks(body, 'utf8')
  }

  setString(str) {
    let obj = JSON.parse(str)
    this._obj = obj
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
