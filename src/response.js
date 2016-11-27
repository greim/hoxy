/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import Body from './body'
import streams from './streams'
import _ from 'lodash'

/**
 * Represents an HTTP response.
 */
export default class Response extends Body {

  constructor() {
    super()
    this._data = {
      statusCode: 200,
      headers: {},
      slow: {},
    }
  }

  /**
   * Getter/setter for HTTP status code.
   */
  get statusCode() {
    return this._getRawDataItem('statusCode')
  }

  set statusCode(code) {
    code = parseInt(code)
    if (!code) {
      throw new Error('invalid status code') // TODO: test this
    }
    this._setRawDataItem('statusCode', code)
  }

  /**
   * Getter/setter for HTTP response header object.
   */
  get headers() {
    return this._getRawDataItem('headers')
  }

  set headers(headers) {
    this._setRawDataItem('headers', _.extend({}, headers))
  }

  _setHttpSource(inResp) {
    this.httpVersion = inResp.httpVersion
    this.statusCode = inResp.statusCode
    this.headers = inResp.headers
    inResp._isOriginal = true
    this._source = inResp
  }

  _setRawDataItem() {
    if (this._phase === 'response') {
      let message = 'requests are not writable during the response phase'
      this.emit('log', {
        level: 'error',
        message: message,
        error: new Error(message),
      })
      return undefined
    }
    return Body.prototype._setRawDataItem.apply(this, arguments)
  }

  /*
   * Prepare this response for sending by removing internal contradictions and
   * otherwise shoring up any HTTP spec violations.
   *
   * TODO: emit debug log events for things that are changed.
   */
  _finalize() {
    if (!this._data.source) {
      this._data.source = streams.from(new Buffer(''))
    }

    if (!this._source._isOriginal) {
      delete this.headers['content-length']
      if (typeof this._source.finalize === 'function') {
        this._source.finalize()
      }
      if (typeof this._source.size === 'function') {
        delete this.headers['transfer-encoding']
        this.headers['content-length'] = this._source.size()
      }
    }

    Object.keys(this.headers).forEach(name => {
      // TODO: test
      if (this.headers[name] === undefined) {
        delete this.headers[name]
      }
    })

    return this
  }
}
