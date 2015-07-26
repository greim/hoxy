/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import { Proxy } from '../src/main'
import streams from '../src/streams'
import assert from 'assert'
import http from 'http'

describe('reverse', function() {

  it('should accept a valid reverse proxy', () => {
    let proxy = new Proxy({
      reverse: 'http://example.com',
    })
  })

  it('should accept a valid reverse proxy', () => {
    let proxy = new Proxy({
      reverse: 'http://localhost:90',
    })
  })

  it('should reject an invalid reverse proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: '//////',
      })
    })
  })

  it('should reject an invalid reverse proxy', () => {
    assert.throws(() => {
      let proxy = new Proxy({
        reverse: 'foo:bar:baz',
      })
    })
  })

  it('should use a reverse proxy', done => {
    let server = http.createServer((req, res) => {
      res.end(req.url)
    }).listen(0)
    server.on('error', done)
    let serverAddr = server.address()

    let proxy = new Proxy({
      reverse: `http://localhost:${serverAddr.port}`,
    }).listen(0)
    proxy.intercept('request', function(req) {
      req.headers['x-foo'] = 'bar'
    })
    proxy.on('error', done)
    let proxyAddr = proxy.address()

    http.get({
      hostname: proxyAddr.address,
      port: proxyAddr.port,
      path: `http://localhost:${serverAddr.port}/foo`,
    }, res => {
      streams.collect(res).then(bod => {
        assert.equal(bod, '/foo')
        done()
      }, done)
    })
  })
})
