/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import { PassThrough } from 'stream'
import send from './lib/send'
import streams from '../lib/streams'

describe('tee', function() {

  it('should tee', () => {
    let pass = new PassThrough()
    return send({}).to({
      body: 'abcdefghijklmnopqrstuvwxyz',
    }).through('response', function(req, resp) {
      resp.tee(pass)
    }).receiving(function*() {
      let passed = yield streams.collect(pass, 'utf8')
      assert.equal(passed, 'abcdefghijklmnopqrstuvwxyz')
    }).promise()
  })
})
