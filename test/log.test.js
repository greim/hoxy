/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import send from './lib/send'
import { finish } from './lib/expect'

describe.only('logging', () => {

  it('should log errors in faulty request interceptors', () => {
    let expect = finish()
    return send({}, true).tweak(proxy => {
      proxy.log('error', ev => {
        assert.strictEqual(ev.level, 'error')
        expect.done()
      })
    }).through('request', function() {
      throw new Error('fake')
    }).promise().then(() => expect.now())
  })

  it('should log errors in faulty response interceptors', () => {
    let expect = finish()
    return send({}, true).tweak(proxy => {
      proxy.log('error', ev => {
        assert.strictEqual(ev.level, 'error')
        expect.done()
      })
    }).through('response', function() {
      throw new Error('fake')
    }).promise().then(() => expect.now())
  })

  it('should log errors in faulty request interceptors with multiple log levels', () => {
    let expect = finish()
    return send({}, true).tweak(proxy => {
      proxy.log('error warn', ev => {
        assert.strictEqual(ev.level, 'error')
        expect.done()
      })
    }).through('request', function() {
      throw new Error('fake')
    }).promise().then(() => expect.now())
  })

  it('should log errors in faulty response interceptors with multiple log levels', () => {
    let expect = finish()
    return send({}, true).tweak(proxy => {
      proxy.log('error warn', ev => {
        assert.strictEqual(ev.level, 'error')
        expect.done()
      })
    }).through('response', function() {
      throw new Error('fake')
    }).promise().then(() => expect.now())
  })

  it('should log errors in faulty async request interceptors', () => {
    let expect = finish()
    return send({}, true).tweak(proxy => {
      proxy.log('error', ev => {
        assert.strictEqual(ev.level, 'error')
        expect.done()
      })
    }).through('request', function*() {
      yield Promise.reject(new Error('fake'))
    }).promise().then(() => expect.now())
  })

  it('should log errors in faulty async response interceptors', () => {
    let expect = finish()
    return send({}, true).tweak(proxy => {
      proxy.log('error', ev => {
        assert.strictEqual(ev.level, 'error')
        expect.done()
      })
    }).through('response', function*() {
      yield Promise.reject(new Error('fake'))
    }).promise().then(() => expect.now())
  })

  it('should not log errors in working request interceptors', () => {
    return send({}, true).tweak(proxy => {
      proxy.log('error', () => {
        throw new Error('should not have logged an error')
      })
    }).through('request', function() {
      // do nothing
    }).promise()
  })

  it('should not log errors in working response interceptors', () => {
    return send({}, true).tweak(proxy => {
      proxy.log('error', () => {
        throw new Error('should not have logged an error')
      })
    }).through('response', function() {
      // do nothing
    }).promise()
  })
})
