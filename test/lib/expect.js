/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import task from '../../lib/task'
import { EventEmitter } from 'events'

/*
An object that expects something in the future.
Call .now() on it when you think everything
ought to be done.
*/

class Expect extends EventEmitter {

  constructor() {
    super()
    this._done = task()
  }

  done() {
    this._done.resolve()
  }

  now() {
    return new Promise((resolve, reject) => {
      this._done.then(resolve, reject)
      setTimeout(() => reject(new Error('expectation not fulfilled')), 0)
    })
  }
}

class ExpectValues extends Expect {

  constructor(...expectedVals) {
    super()
    this._vals = new Set(expectedVals)
  }

  set(val) {
    let existed = this._vals.delete(val)
    if (!existed) {
      this._done.reject(new Error(`value ${JSON.stringify(val)} didn't exist`))
    } else if (this._vals.size === 0) {
      this._done.resolve()
    }
  }
}

export function finish(...args) { return new Expect(...args) }
export function values(...args) { return new ExpectValues(...args) }
