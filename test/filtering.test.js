/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import send from './lib/send'
import { finish, values } from './lib/expect'

function roundTrip(opts) {
  var s = send(opts.request || {})
  if (opts.response) { s.to(opts.response) }
  if (opts.client) {
    s.receiving(function*(resp) {
      opts.client(resp)
    })
  }
  for (let intercept of (opts.intercepts || [])) {
    s.through(intercept.opts, intercept.callback)
  }
  return s.promise()
}

describe('filtering', function() {

  it('should filter based on string matches on method', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', method: 'GET' },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'response', method: 'POST' },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on method', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', method: /GET/ },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'request', method: /^post$/i },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on string matches on hostname', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', hostname: 'google.com' },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req, resp) {
          expect.set('switch')
          // send() resets hostname, so need to do this
          this.data('hostname', req.hostname)
          req.hostname = 'foobar'
        },
      }, {
        opts: { phase: 'response', hostname: 'foobar' },
        callback: function(req) {
          expect.set('hit')
          req.hostname = this.data('hostname') // put hostname back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on hostname', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', hostname: /google.com/ },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req, resp) {
          expect.set('switch')
          // send() resets hostname, so need to do this
          this.data('hostname', req.hostname)
          req.hostname = 'foobar'
        },
      }, {
        opts: { phase: 'response', hostname: /^foobar$/ },
        callback: function(req) {
          expect.set('hit')
          req.hostname = this.data('hostname') // put hostname back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on string matches on port', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', port: '80' },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req, resp) {
          expect.set('switch')
          // send() resets port, so need to do this
          this.data('port', req.port)
          req.port = 7777
        },
      }, {
        opts: { phase: 'response', port: '7777' },
        callback: function(req) {
          expect.set('hit')
          req.port = this.data('port') // put port back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on port', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', port: /80/ },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req) {
          expect.set('switch')
          // send() resets port, so need to do this
          this.data('port', req.port)
          req.port = 7777
        },
      }, {
        opts: { phase: 'response', port: /^7777$/ },
        callback: function(req) {
          expect.set('hit')
          req.port = this.data('port') // put port back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on number matches on port', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', port: 80 },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req) {
          expect.set('switch')
          // send() resets port, so need to do this
          this.data('port', req.port)
          req.port = 7777
        },
      }, {
        opts: { phase: 'response', port: 7777 },
        callback: function(req) {
          expect.set('hit')
          req.port = this.data('port') // put port back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on string matches on url', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', url: '/foobaz' },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'response', url: '/foobar' },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on url', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', url: /^\/foobaz$/ },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'response', url: /^\/foobar$/ },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on route pattern matches on url', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', url: '/x/:name' },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'response', url: '/:name' },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on string matches on fullUrl', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', fullUrl: '' },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'request' },
        callback: function(req) {
          expect.set('switch')
          // send() resets fullUrl, so need to do this
          this.data('fullUrl', req.fullUrl())
          req.fullUrl('http://example.com/blah')
        },
      }, {
        opts: { phase: 'request', fullUrl: 'http://example.com/blah' },
        callback: function() {
          expect.set('hit')
        },
      }, {
        opts: { phase: 'request' },
        callback: function(req) {
          req.fullUrl(this.data('fullUrl')) // put fullUrl back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on fullUrl', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', fullUrl: /nope/ },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req) {
          expect.set('switch')
          // send() resets fullUrl, so need to do this
          this.data('fullUrl', req.fullUrl())
          req.fullUrl('http://example.com/blah')
        },
      }, {
        opts: { phase: 'response', fullUrl: /example.com/ },
        callback: function(req) {
          expect.set('hit')
          req.fullUrl(this.data('fullUrl')) // put fullUrl back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on route pattern matches on fullUrl', () => {
    let expect = values('switch', 'hit')
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
      },
      intercepts: [{
        opts: { phase: 'request', fullUrl: 'http://localhost:8282/x/:id' },
        callback: function() {
          throw new Error('should not have called intercept')
        },
      }, {
        opts: { phase: 'response' },
        callback: function(req) {
          expect.set('switch')
          // send() resets fullUrl, so need to do this
          this.data('fullUrl', req.fullUrl())
          req.fullUrl('http://example.com/blah/123')
        },
      }, {
        opts: { phase: 'response', fullUrl: 'http://example.com/blah/:id' },
        callback: function(req) {
          expect.set('hit')
          req.fullUrl(this.data('fullUrl')) // put fullUrl back so send() can finish
        },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on string matches on contentType', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      },
      intercepts: [{
        opts: { phase: 'request', contentType: 'text/plain' },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'request', contentType: 'text/plain; charset=utf-8' },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on contentType', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      },
      intercepts: [{
        opts: { phase: 'request', contentType: /ascii/ },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'request', contentType: /utf\-8/ },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on string matches on mimeType', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      },
      intercepts: [{
        opts: { phase: 'request', mimeType: 'text/xml' },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'request', mimeType: 'text/plain' },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter based on regex matches on mimeType', () => {
    let expect = finish()
    return roundTrip({
      request: {
        path: 'http://example.com/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      },
      intercepts: [{
        opts: { phase: 'request', mimeType: /xml$/ },
        callback: function() { throw new Error('should not have called intercept') },
      }, {
        opts: { phase: 'request', mimeType: /plain$/ },
        callback: function() { expect.done() },
      }],
    }).then(() => expect.now())
  })

  it('should filter mimeTypes during appropriate phase', () => {
    let expect = values('req', 'resp')
    return roundTrip({
      request: {
        method: 'POST',
        body: '{"a":"b"}',
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
      response: {
        statusCode: 200,
        body: 'ab',
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      },
      intercepts: [{
        opts: { phase: 'request', mimeType: 'application/json' },
        callback: function() { expect.set('req') },
      }, {
        opts: { phase: 'response', mimeType: 'text/plain' },
        callback: function() { expect.set('resp') },
      }, {
        opts: { phase: 'request', mimeType: 'text/plain' },
        callback: function() { throw new Error('should not hit request') },
      }, {
        opts: { phase: 'response', mimeType: 'application/json' },
        callback: function() { throw new Error('should not hit response') },
      }],
    }).then(() => expect.now())
  })

  it('should filter contentTypes during appropriate phase', () => {
    let expect = values('req', 'resp')
    return roundTrip({
      request: {
        method: 'POST',
        body: '{"a":"b"}',
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
      response: {
        statusCode: 200,
        body: 'ab',
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      },
      intercepts: [{
        opts: { phase: 'request', contentType: /application/ },
        callback: function() { expect.set('req') },
      }, {
        opts: { phase: 'response', contentType: /plain/ },
        callback: function() { expect.set('resp') },
      }, {
        opts: { phase: 'request', contentType: /plain/ },
        callback: function() { throw new Error('should not hit request') },
      }, {
        opts: { phase: 'response', contentType: /application/ },
        callback: function() { throw new Error('should not hit response') },
      }],
    }).then(() => expect.now())
  })
})
