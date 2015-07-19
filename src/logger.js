/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

const levels = {
  debug: 100,
  info: 200,
  warn: 300,
  error: 400,
}

export default class Logger {

  constructor(level) {
    this._level = level
  }

  log(level, message) {
    if (!levels.hasOwnProperty(level)) {
      return
    }
    if (levels[this._level] <= levels[level]) {
      console.error(message)
    }
  }

  debug(message) {
    if (levels[this._level] <= levels.debug) {
      console.error(message)
    }
  }

  info(message) {
    if (levels[this._level] <= levels.info) {
      console.error(message)
    }
  }

  warn(message) {
    if (levels[this._level] <= levels.warn) {
      console.error(message)
    }
  }

  error(message) {
    if (levels[this._level] <= levels.error) {
      console.error(message)
    }
  }
}
