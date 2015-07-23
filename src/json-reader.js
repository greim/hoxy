/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import BaseReader from './base-reader'

export default class JsonReader extends BaseReader {

  constructor(obj) {
    super()
    this._obj = obj
  }

  toString() {
    return JSON.stringify(this._obj)
  }
}
