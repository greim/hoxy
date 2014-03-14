/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var assert = require('assert')
var Request = require('../lib/request')
var streams = require('../lib/streams')

// ---------------------------

function getRequestData(){
  var data = streams.from([
    new Buffer('<!doctype html><html><head></head><body>', 'utf8'),
    new Buffer('<p>foo</p>', 'utf8'),
    new Buffer('</body></html>', 'utf8')
  ])
  data.protocol = 'http:'
  data.hostname = 'example.com'
  data.port = 8080
  data.method = 'GET'
  data.url = 'http://example.com:8080/foo.html'
  data.headers = {
    'host': 'example.com:8080',
    'origin': 'http://example.com:8080',
    'referer': 'http://example.com:8080/',
    'content-type': 'text/html; charset=utf-8',
    'cookie': 'foo=bar; buz%20yak=baz%20qux',
    'content-length': data.size()
  }
  return data;
}

describe('Request', function(){

  it('should construct', function(){
    var request = new Request()
  })

  it('should accept raw data', function(){
    var req = new Request()
    req._setHttpSource(getRequestData())
  })

  it('should get and set protocol', function(){
    var req = new Request()
    req._setHttpSource(getRequestData())
    assert.strictEqual(req.protocol, 'http:')
    req.protocol = 'https:'
    assert.strictEqual(req.protocol, 'https:')
  })

  it('should get and set hostname', function(){
    var req = new Request()
    req._setHttpSource(getRequestData())
    assert.strictEqual(req.hostname, 'example.com')
    req.hostname = 'www.example.com'
    assert.strictEqual(req.hostname, 'www.example.com')
    assert.throws(function(){
      req.hostname = ''
    }, Error)
  })

  it('should get and set port', function(){
    var req = new Request()
    req._setHttpSource(getRequestData())
    assert.strictEqual(req.port, 8080)
    req.port = '8081'
    assert.strictEqual(req.port, 8081)
    assert.throws(function(){
      req.port = 'zzz'
    }, Error)
  })

  it('should get and set method', function(){
    var req = new Request()
    req._setHttpSource(getRequestData())
    assert.strictEqual(req.method, 'GET')
    req.method = 'put'
    assert.strictEqual(req.method, 'PUT')
    assert.throws(function(){
      req.method = ''
    }, Error)
  })

  it('should get and set url', function(){
    var req = new Request()
    req._setHttpSource(getRequestData())
    assert.strictEqual(req.url, '/foo.html')
    req.url = '/bar.html'
    assert.strictEqual(req.url, '/bar.html')
    assert.throws(function(){
      req.url = 'zzz'
    }, Error)
  })

  it('should get and set headers', function(){
    var req = new Request()
    var data = getRequestData()
    req._setHttpSource(data)
    assert.deepEqual(req.headers, data.headers)
  })

  it('should get and set source', function(){
    var req = new Request()
    var data = getRequestData()
    req._setHttpSource(data)
    assert.deepEqual(req._source, data)
  })

  it('should get full URL', function(){
    var req = new Request()
    var data = getRequestData()
    req._setHttpSource(data)
    assert.strictEqual(req.fullUrl(), 'http://example.com:8080/foo.html')
    req.port = 80;
    req.headers.host = 'example.com'
    assert.strictEqual(req.fullUrl(), 'http://example.com/foo.html')
    req.port = 81;
    assert.strictEqual(req.fullUrl(), 'http://example.com:81/foo.html')
  })

  it('should set full URL', function(){
    var req = new Request()
    var data = getRequestData()
    req._setHttpSource(data)
    var fullUrl = 'http://example2.com:90/foo'
    req.fullUrl(fullUrl)
    assert.strictEqual(req.protocol, 'http:')
    assert.strictEqual(req.hostname, 'example2.com')
    assert.strictEqual(req.port, 90)
    assert.strictEqual(req.url, '/foo')
    assert.strictEqual(req.fullUrl(), fullUrl)
  })
})
