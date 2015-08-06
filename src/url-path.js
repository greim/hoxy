/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import path from 'path'

export default class Path {

  constructor(origPath) {
    this._origPath = origPath
    let steps = origPath.split(/[\\\/]/g)
    if (/^[a-z]:$/i.test(steps[0])) {
      this._isAbsolute = true
      this._drive = steps.shift()
    } else {
      this._drive = ''
      if (!steps[0]) {
        steps.shift()
        this._isAbsolute = true
      }
    }
    this._steps = steps
  }

  toUrlPath() {
    let urlPath = this._steps.join('/')
    if (this._isAbsolute) {
      urlPath = '/' + urlPath
    }
    return urlPath
  }

  toSystemPath() {
    let filePath = this._steps.join(path.sep)
    if (this._isAbsolute) {
      filePath = this._drive + path.sep + filePath
    }
    return filePath
  }

  rootTo(rootPath) {
    if (!rootPath._isAbsolute) {
      throw new Error('root path is not absolute')
    } else {
      let newPath = new Path(this._origPath)
      newPath._steps = rootPath._steps.concat(this._steps)
      newPath._drive = rootPath._drive
      newPath._isAbsolute = true
      return newPath
    }
  }
}
