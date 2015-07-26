/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import Response from '../src/response'
import streams from '../src/streams'

function getResponseData(){
  let data = streams.from([
    new Buffer('<!doctype html><html><head></head><body>', 'utf8'),
    new Buffer('<p>foo</p>', 'utf8'),
    new Buffer('</body></html>', 'utf8'),
  ])
  data.statusCode = 200;
  data.headers = {
    'content-type': 'text/html; charset=utf-8',
    'content-length': data.size(),
  }
  return data
}

describe('Response', function(){

  it('should construct', function(){
    let resp = new Response()
  })

  it('should accept raw data', function(){
    let resp = new Response()
    resp._setHttpSource(getResponseData())
  })

  it('should get and set headers', function(){
    let resp = new Response()
    let data = getResponseData()
    resp._setHttpSource(data)
    assert.deepEqual(resp.headers, data.headers)
  })

  it('should get and set status code', function(){
    let resp = new Response()
    resp._setHttpSource(getResponseData())
    assert.strictEqual(resp.statusCode, 200)
  })
})
