/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import BaseReader from './base-reader'
import querystring from 'querystring'

export default class ParamReader extends BaseReader {

  constructor(params) {
    super()
    this._params = params
  }

  toString() {
    return querystring.stringify(this._params)
  }
}
