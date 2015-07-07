/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import chunker from './chunker'
import { Readable } from 'stream'
import querystring from 'querystring'

// ---------------------------

// TODO: test
export default class ParamReader extends Readable {

  constructor(params) {
    super({})
    this._params = params
    this._i = 0
    this._keepGoing = true
  }

  get stringable() {
    return true
  }

  toString() {
    return querystring.stringify(this._params)
  }

  finalize() {
    let body = this.toString()
    this._buffers = chunker.stringToChunks(body, 'utf8')
  }

  setString(str) {
    let params = querystring.parse(str)
    this._params = params
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
