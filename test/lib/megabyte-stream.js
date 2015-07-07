/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import streams from '../../lib/streams'
import Readable from 'string-stream'

// ---------------------------

const hex = '0123456789abcdef'
let kb = []
for (let i=0; i<64; i++)
  kb.push(hex)
kb = kb.join('')

/**
 * Return a readable stream from which can
 * be read a megabyte of dummy data.
 */
export default function() {
  const result = []
  for (let i=0; i<1000; i++) {
    result.push(kb)
  }
  return new Readable(result.join(''))
}
