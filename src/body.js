/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import streams from './streams'
import DomReader from './dom-reader'
import JsonReader from './json-reader'
import ParamReader from './param-reader'
import BufferReader from './buffer-reader'
import zlib from 'zlib'
import { EventEmitter } from 'events'

export default class Body extends EventEmitter {

  // TODO: test get and set for all five
  get $() {
    let src = this._source
    return src ? src._$ : undefined
  }

  set $($) {
    this._source = new DomReader($, this.headers['content-type'])
  }

  get json() {
    let src = this._source
    return src ? src._obj : undefined
  }

  set json(obj) {
    this._source = new JsonReader(obj)
  }

  get params() {
    let src = this._source
    return src ? src._params : undefined
  }

  set params(params) {
    this._source = new ParamReader(params)
  }

  get buffer() {
    let src = this._source
    return src ? src._buffer : undefined
  }

  set buffer(buffer) {
    this._source = new BufferReader(buffer)
  }

  get string() {
    if (this._source && this._source.stringable) {
      return this._source.toString()
    } else {
      return undefined
    }
  }

  set string(str) {
    this._source = new BufferReader(new Buffer(str, 'utf8'))
  }

  // -------------------------------------------------

  get _source() {
    return this._getRawDataItem('source')
  }

  set _source(readable) {
    this._setRawDataItem('source', readable)
  }

  // -------------------------------------------------

  get httpVersion() {
    return this._getRawDataItem('httpVersion')
  }

  set httpVersion(httpVersion) {
    this._setRawDataItem('httpVersion', httpVersion)
  }

  // -------------------------------------------------

  slow(opts) {
    if (opts) {
      this._setRawDataItem('slow', {
        latency: parseInt(opts.latency) || -1,
        rate: parseInt(opts.rate) || -1,
      })
    }
    return this._getRawDataItem('slow')
  }

  // -------------------------------------------------

  tee(writable) {
    let tees = this._getRawDataItem('tees') || []
    tees.push(writable)
    this._setRawDataItem('tees', tees)
  }

  _tees() {
    return this._getRawDataItem('tees') || []
  }

  // -------------------------------------------------

  _setRawDataItem(name, value) {
    if (this._phase === 'request-sent' || this._phase === 'response-sent') {
      // TODO: test writability of requests and response in letious phases.
      let message = 'requests and responses are not writable during the ' + this._phase + ' phase'
      this.emit('log', {
        level: 'error',
        message: message,
        error: new Error(message),
      })
      return
    }
    this._data[name] = value
    this._populated = true
  }

  _getRawDataItem(name) {
    return this._data[name]
  }

  _load() {
    if (this._source && this._source.stringable) {
      return Promise.resolve()
    } else {
      let readable = this._source
      if (this.headers['content-encoding'] === 'gzip') {
        // TODO: test coverage
        let gunzip = zlib.createGunzip()
        readable = readable.pipe(gunzip)
      }
      return streams.collect(readable)
      .then(buffer => {
        delete this.headers['content-encoding'];
        this._source = streams.from(buffer)
      })
    }
  }
}
