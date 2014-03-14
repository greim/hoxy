/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var await = require('await')
var assert = require('assert')
var roundTrip = require('./lib/round-trip')
var getMegaSource = require('./lib/megabyte-stream')

// ---------------------------

describe('Round trips', function(){

  it('should filter based on string matches on method', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', method: 'GET' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', method: 'POST' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on method', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', method: /GET/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'request', method: /^post$/i },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on host', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', host: 'localhost:8181' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', host: 'localhost:8282' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on host', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'response', host: /bazqux/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', host: /loc/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on hostname', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', hostname: 'x' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', hostname: 'localhost' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on hostname', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', hostname: /bazqux/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', hostname: /localho/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on port', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', port: '8181' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', port: '8282' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on port', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', port: /81/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', port: /82/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on number matches on port', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', port: 8181 },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', port: 8282 },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on url', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', url: '/foobaz' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', url: '/foobar' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on url', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', url: /^\/x/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', url: /^\/f/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on route pattern matches on url', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', url: '/x/:foo' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', url: '/:foo' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on fullUrl', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', fullUrl: '' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', fullUrl: 'http://localhost:8282/foobar' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on fullUrl', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', fullUrl: /^xyz/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', fullUrl: /foobar$/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on route pattern matches on fullUrl', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc'
      },
      intercepts: [{
        opts: { phase:'request', fullUrl: 'http://localhost:8282/x/:id' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', fullUrl: 'http://localhost:8282/:id' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on contentType', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        }
      },
      intercepts: [{
        opts: { phase:'request', contentType: 'text/plain' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'request', contentType: 'text/plain; charset=utf-8' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on contentType', function(done){
    roundTrip({
      response: {
        statusCode: 200,
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        }
      },
      intercepts: [{
        opts: { phase:'response', contentType: /ascii/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', contentType: /utf\-8/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on string matches on contentType', function(done){
    roundTrip({
      request: {
        url: '/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        }
      },
      intercepts: [{
        opts: { phase:'request', mimeType: 'text/xml' },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'request', mimeType: 'text/plain' },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on regex matches on mimeType', function(done){
    roundTrip({
      response: {
        statusCode: 200,
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        }
      },
      intercepts: [{
        opts: { phase:'response', mimeType: /ascii/ },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', mimeType: /text/ },
        callback: function(){ done() }
      }]
    })
  })

  it('should filter based on filtering function', function(done){
    var shouldBeUndefined = new Error('this error should have been overwritten')
    roundTrip({
      response: {
        statusCode: 200,
        body: 'abc',
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        }
      },
      intercepts: [{
        opts: { phase:'request', filter: function(){return false} },
        callback: function(){ done(new Error('should not have called intercept')) }
      },{
        opts: { phase:'response', filter: function(){shouldBeUndefined=undefined;return true} },
        callback: function(){ done(shouldBeUndefined) }
      }]
    })
  })

  it('should filter request mimeTypes during appropriate phase', function(done){
    var hits = {}
    roundTrip({
      request: {
        method: 'POST',
        body: '{"a":"b"}',
        headers: {
          'content-type': 'application/json'
        }
      },
      response: {
        statusCode: 200,
        body: 'ab',
        headers: {
          'content-type': 'text/plain'
        }
      },
      intercepts: [{
        opts: { phase:'request', mimeType: 'application/json' },
        callback: function(){ hits.req = true }
      },{
        opts: { phase:'response', mimeType: 'text/plain' },
        callback: function(){ hits.resp = true }
      },{
        opts: { phase:'request', mimeType: 'text/plain' },
        callback: function(){ hits.reqBad = true }
      },{
        opts: { phase:'response', mimeType: 'application/json' },
        callback: function(){ hits.respBad = true }
      }],
      client: function(){
        assert.ok(hits.req, 'did not hit request')
        assert.ok(hits.resp, 'did not hit response')
        assert.ok(!hits.reqBad, 'hit request but should not have')
        assert.ok(!hits.respBad, 'hit response but should not have')
        done()
      }
    })
  })

  it('should filter request contentTypes during appropriate phase', function(done){
    var hits = {}
    roundTrip({
      request: {
        method: 'POST',
        body: '{"a":"b"}',
        headers: {
          'content-type': 'application/json'
        }
      },
      response: {
        statusCode: 200,
        body: 'ab',
        headers: {
          'content-type': 'text/plain'
        }
      },
      intercepts: [{
        opts: { phase:'request', contentType: 'application/json' },
        callback: function(){ hits.req = true }
      },{
        opts: { phase:'response', contentType: 'text/plain' },
        callback: function(){ hits.resp = true }
      },{
        opts: { phase:'request', contentType: 'text/plain' },
        callback: function(){ hits.reqBad = true }
      },{
        opts: { phase:'response', contentType: 'application/json' },
        callback: function(){ hits.respBad = true }
      }],
      client: function(){
        assert.ok(hits.req, 'did not hit request')
        assert.ok(hits.resp, 'did not hit response')
        assert.ok(!hits.reqBad, 'hit request but should not have')
        assert.ok(!hits.respBad, 'hit response but should not have')
        done()
      }
    })
  })

  it('should filter request and response mimeTypes', function(done){
    var hits = {}
    roundTrip({
      request: {
        method: 'POST',
        body: '{"a":"b"}',
        headers: {
          'content-type': 'application/json'
        }
      },
      response: {
        statusCode: 200,
        body: 'ab',
        headers: {
          'content-type': 'text/plain'
        }
      },
      intercepts: [{
        opts: { phase:'response', requestMimeType: 'application/json' },
        callback: function(){ hits.respReq = true }
      },{
        opts: { phase:'request', requestMimeType: 'text/plain' },
        callback: function(){ hits.reqReqBad = true }
      },{
        opts: { phase:'response', responseMimeType: 'application/json' },
        callback: function(){ hits.respRespBad = true }
      },{
        opts: { phase:'request', requestMimeType: 'application/json' },
        callback: function(){ hits.reqReq = true }
      },{
        opts: { phase:'response', responseMimeType: 'text/plain' },
        callback: function(){ hits.respResp = true }
      },{
        opts: { phase:'response', requestMimeType: 'text/plain' },
        callback: function(){ hits.respReqBad = true }
      },{
        opts: { phase:'request', responseMimeType: 'application/json' },
        callback: function(){ hits.reqRespBad = true }
      }],
      client: function(){
        assert.ok(hits.respReq, 'should have hit response matching request')
        assert.ok(hits.reqReq, 'should have hit request matching request')
        assert.ok(hits.respResp, 'should have hit response matching response')
        assert.ok(!hits.respReqBad, 'should not have hit response matching request')
        assert.ok(!hits.reqRespBad, 'should not have hit request matching response')
        assert.ok(!hits.reqReqBad, 'should not have hit request matching request')
        assert.ok(!hits.respRespBad, 'should not have hit response matching response')
        done()
      }
    })
  })

  it('should filter request and response contentTypes', function(done){
    var hits = {}
    roundTrip({
      request: {
        method: 'POST',
        body: '{"a":"b"}',
        headers: {
          'content-type': 'application/json'
        }
      },
      response: {
        statusCode: 200,
        body: 'ab',
        headers: {
          'content-type': 'text/plain'
        }
      },
      intercepts: [{
        opts: { phase:'response', requestContentType: 'application/json' },
        callback: function(){ hits.respReq = true }
      },{
        opts: { phase:'request', requestContentType: 'text/plain' },
        callback: function(){ hits.reqReqBad = true }
      },{
        opts: { phase:'response', responseContentType: 'application/json' },
        callback: function(){ hits.respRespBad = true }
      },{
        opts: { phase:'request', requestContentType: 'application/json' },
        callback: function(){ hits.reqReq = true }
      },{
        opts: { phase:'response', responseContentType: 'text/plain' },
        callback: function(){ hits.respResp = true }
      },{
        opts: { phase:'response', requestContentType: 'text/plain' },
        callback: function(){ hits.respReqBad = true }
      },{
        opts: { phase:'request', responseContentType: 'application/json' },
        callback: function(){ hits.reqRespBad = true }
      }],
      client: function(){
        assert.ok(hits.respReq, 'should have hit response matching request')
        assert.ok(hits.reqReq, 'should have hit request matching request')
        assert.ok(hits.respResp, 'should have hit response matching response')
        assert.ok(!hits.respReqBad, 'should not have hit response matching request')
        assert.ok(!hits.reqRespBad, 'should not have hit request matching response')
        assert.ok(!hits.reqReqBad, 'should not have hit request matching request')
        assert.ok(!hits.respRespBad, 'should not have hit response matching response')
        done()
      }
    })
  })
})
