/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import chunker from './chunker'
import cheerio from 'cheerio'
import { Readable } from 'stream'
import isTypeXml from './is-xml'

// ---------------------------

// TODO: test
export default class DomReader extends Readable {

  constructor($, contentType) {
    super({})
    this._contentType = contentType
    this._$ = $
    this._i = 0
    this._keepGoing = true
  }

  get stringable() {
    return true
  }

  toString() {
    let isXml = isTypeXml(this._contentType)
    return this._$[isXml ? 'xml' : 'html']()
  }

  finalize() {
    let body = this.toString()
    this._buffers = chunker.stringToChunks(body, 'utf8')
  }

  setString(str, mimeType) {
    let isXml = isTypeXml(mimeType)
    this._$ = cheerio.load(str, { xmlMode: isXml })
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

