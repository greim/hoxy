/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// TODO: This simple regex will cover many cases but
// will probably need some improvements.

const patt = /xml/

export default function(mimeType) {
  if (!mimeType) {
    return false
  } else {
    return patt.test(mimeType)
  }
}
