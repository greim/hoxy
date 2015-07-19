/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import BaseReader from './base-reader'
import isTypeXml from './is-xml'

// ---------------------------

// TODO: test
export default class DomReader extends BaseReader {

  constructor($, contentType) {
    super()
    this._contentType = contentType
    this._$ = $
  }

  toString() {
    let isXml = isTypeXml(this._contentType)
    return this._$[isXml ? 'xml' : 'html']()
  }
}
