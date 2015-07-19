/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

export default function wait(t) {
  return new Promise(res => {
    if (t) { setTimeout(res, t) }
    else { setImmediate(res) }
  })
}
