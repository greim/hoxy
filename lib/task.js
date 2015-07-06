/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

export default function() {
  let resolve, reject, p = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  p.resolve = resolve
  p.reject = reject
  return p
}
