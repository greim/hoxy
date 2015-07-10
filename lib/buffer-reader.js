/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import BaseReader from './base-reader'

export default class BufferReader extends BaseReader {

  constructor(buffer) {
    super()
    this._buffer = buffer
  }

  toString(encoding) {
    return this._buffer.toString(encoding)
  }

  finalize() {
    // noop since this._buffer already exists
  }
}
