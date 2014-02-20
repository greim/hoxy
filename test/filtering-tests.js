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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
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
})
