/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Proxy = require('./lib/proxy')

module.exports = {
  Proxy: Proxy,
  createServer: function(opts) {
    return new Proxy(opts)
  },
}
