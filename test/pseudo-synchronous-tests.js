/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import querystring from 'querystring'
import roundTrip from './lib/round-trip'
import send from './lib/send'
import adapt from 'ugly-adapter'
import wait from '../lib/wait'
import co from 'co'

// ---------------------------

describe('pseudo-synchronous', function(){

  it('wait on returned promises', () => {
    let start = Date.now()
    return send({}).through('request', function() {
      return co(function*() {
        yield wait(50)
      })
    }).to({
      body: '123',
    }).receiving(function*(resp) {
      let end = Date.now()
      assert.strictEqual(resp.body, '123')
      assert.ok(end - start >= 50)
    }).promise()
  })

  it('should allow a generator in request', () => {
    let start = Date.now()
    return send({}).through('request', function*() {
      yield wait(50)
    }).to({
      body: '123',
    }).receiving(function*(resp) {
      let end = Date.now()
      assert.strictEqual(resp.body, '123')
      assert.ok(end - start >= 50)
    }).promise()
  })

  it('should allow a generator in response', () => {
    let start = Date.now()
    return send({}).through('response', function*() {
      yield wait(50)
    }).to({
      body: '123',
    }).receiving(function*(resp) {
      let end = Date.now()
      assert.strictEqual(resp.body, '123')
      assert.ok(end - start >= 50)
    }).promise()
  })
})
