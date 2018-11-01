/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

//import { Proxy } from '../src/main'
import Proxy from '../src/proxy'
import send from './lib/send'
import assert from 'assert'

describe('hoxy', function() {

  it('should accept a valid upstream proxy', () => {
    let proxy = new Proxy({
      upstreamProxy: 'localhost:8080',
    })
  })

  it('should accept a valid upstream proxy', () => {
    let proxy = new Proxy({
      upstreamProxy: 'http://example.com:7070',
    })
  })

  it('should accept a valid upstream proxy', () => {
    let proxy = new Proxy({
      upstreamProxy: 'https://localhost:9090',
    })
  })

  it('should reject an invalid upstream proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        upstreamProxy: 'localhost:8080/foo',
      })
    }, /invalid/)
  })

  it('should reject an invalid upstream proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        upstreamProxy: 'localhost',
      })
    }, /invalid/)
  })

  it('should reject an invalid upstream proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        upstreamProxy: 'http://localhost',
      })
    }, /invalid/)
  })

  it('should reject an invalid upstream proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        upstreamProxy: 'http:localhost:8080',
      })
    }, /invalid/)
  })

  it('should actually use an upstream proxy', done => {
    let upstream = new Proxy().listen(0, () => {
      let upstreamProxy = `localhost:${upstream.address().port}`
      send({}, false, { upstreamProxy }).promise().catch(done)
    })
    upstream.intercept('request', () => done())
  })
})
