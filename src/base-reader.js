/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import { Readable } from 'stream'

export default class BaseReader extends Readable {

  constructor() {
    super({})
  }

  get stringable() {
    return true
  }

  finalize() {
    let body = this.toString()
    this._buffer = new Buffer(body, 'utf8')
  }

  _read() {
    if (this._buffer) {
      this.push(this._buffer)
      delete this._buffer
    } else {
      this.push(null)
    }
  }

  size() {
    return this._buffer.length
  }

  toString() {
    throw new Error('toString() not overridden')
  }
}
