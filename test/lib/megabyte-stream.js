/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var streams = require('../../lib/streams')

// ---------------------------

var hex = '0123456789abcdef'
var kb = []
for (var i=0; i<64; i++)
  kb.push(hex)
kb = kb.join('')

/**
 * Return a readable stream from which can
 * be read a megabyte of dummy data.
 */
module.exports = function(){
  var result = []
  for (var i=0; i<1000; i++)
    result.push(new Buffer(kb, 'utf8'))
  return streams.from(result)
}
