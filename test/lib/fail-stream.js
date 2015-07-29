/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import { Readable } from 'stream'

export class ErrorStream extends Readable {

  constructor() {
    super({})
    this._buffers = [
      new Buffer('x'.repeat(256), 'utf8'),
      new Buffer('x'.repeat(256), 'utf8'),
      new Buffer('x'.repeat(256), 'utf8'),
    ]
  }

  _read() {
    if (this._buffers.length > 0) {
      this.push(this._buffers.shift())
    } else {
      this.emit('error', new Error('error emit'))
    }
  }
}

export class DestroyStream extends Readable {

  constructor() {
    super({})
    this._buffers = [
      new Buffer('x'.repeat(256), 'utf8'),
      new Buffer('x'.repeat(256), 'utf8'),
      new Buffer('x'.repeat(256), 'utf8'),
    ]
  }

  _read() {
    if (this._buffers.length > 0) {
      this.push(this._buffers.shift())
    } else {
      var error = new Error('socket hang up')
      error.code = 'ECONNRESET'
      this.emit('error', error)
    }
  }
}
