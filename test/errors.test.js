/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import { ErrorStream, DestroyStream } from './lib/fail-stream'
import send from './lib/send'

describe('handle errors', function() {

  it('should not crash on request stream emitted error', () => {
    let body = new ErrorStream()
    return send({ body }, true).promise().then(() => {
      throw new Error('should have failed')
    }).catch(err => {
      assert.ok(err.message.includes('error emit'))
    })
  })

  it('should not crash when request stream destroyed itself', () => {
    let body = new DestroyStream()
    return send({ body }, true).promise().then(() => {
      throw new Error('should have failed')
    }).catch(err => {
      //assert.ok(err.message.includes('error emit'))
    })
  })
})
