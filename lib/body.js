/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import chunker from './chunker'
import streams from './streams'
import DomReader from './dom-reader'
import JsonReader from './json-reader'
import ParamReader from './param-reader'
import BufferReader from './buffer-reader'
import zlib from 'zlib'
import { EventEmitter } from 'events'

// -------------------------------------------------

export default class Body extends EventEmitter {

  // TODO: test get and set for all five
  get $() {
    var src = this._source
    return src ? src._$ : undefined
  }

  set $($) {
    this._source = new DomReader($, this.headers['content-type'])
  }

  get json() {
    var src = this._source
    return src ? src._obj : undefined
  }

  set json(obj) {
    this._source = new JsonReader(obj)
  }

  get params() {
    var src = this._source
    return src ? src._params : undefined
  }

  set params(params) {
    this._source = new ParamReader(params)
  }

  get buffers() {
    var src = this._source
    return src ? src._buffers : undefined
  }

  set buffers(buffers) {
    this._source = new BufferReader(buffers)
  }

  get string() {
    if (this._source && this._source.stringable) {
      return this._source.toString()
    } else {
      return undefined
    }
  }

  set string(str) {
    this._source = new BufferReader(chunker.stringToChunks(str))
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
    var tees = this._getRawDataItem('tees') || []
    tees.push(writable)
    this._setRawDataItem('tees', tees)
  }

  _tees() {
    return this._getRawDataItem('tees') || []
  }

  // -------------------------------------------------

  _setRawDataItem(name, value) {
    if (this._phase === 'request-sent' || this._phase === 'response-sent') {
      // TODO: test writability of requests and response in various phases.
      var message = 'requests and responses are not writable during the ' + this._phase + ' phase'
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

  _load(callback, ctx) {
    if (ctx) {
      callback = callback.bind(ctx)
    }
    if (this._source && this._source.stringable) {
      setTimeout(callback, 0)
    } else {
      var readable = this._source
      if (this.headers['content-encoding'] === 'gzip') {
        // TODO: test coverage
        var gunzip = zlib.createGunzip()
        readable = readable.pipe(gunzip)
      }
      streams.collect(readable)
      .onkeep(got => {
        this.headers['content-encoding'] = undefined
        this._source = streams.from(got.buffers)
        callback()
      })
      .onfail(callback)
    }
  }
}
