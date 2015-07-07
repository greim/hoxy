/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var assert = require('assert')
var Response = require('../lib/response')
var streams = require('../lib/streams')

// ---------------------------

function getResponseData(){
  var data = streams.from([
    new Buffer('<!doctype html><html><head></head><body>', 'utf8'),
    new Buffer('<p>foo</p>', 'utf8'),
    new Buffer('</body></html>', 'utf8')
  ])
  data.statusCode = 200;
  data.headers = {
    'content-type': 'text/html; charset=utf-8',
    'content-length': data.size()
  }
  return data
}

describe('Response', function(){

  it('should construct', function(){
    var resp = new Response()
  })

  it('should accept raw data', function(){
    var resp = new Response()
    resp._setHttpSource(getResponseData())
  })

  it('should get and set headers', function(){
    var resp = new Response()
    var data = getResponseData()
    resp._setHttpSource(data)
    assert.deepEqual(resp.headers, data.headers)
  })

  it('should get and set status code', function(){
    var resp = new Response()
    resp._setHttpSource(getResponseData())
    assert.strictEqual(resp.statusCode, 200)
  })
})
