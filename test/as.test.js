/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import querystring from 'querystring'
import send from './lib/send'
import fs from 'fs'
import streams from '../lib/streams'

describe('Load data as type', function() {

  it('should load request bodies (send)', () => {
    send({
      method: 'POST',
      body: 'abcdefg',
    }).through('request', function*(req) {
      yield req._load()
      assert.strictEqual(req.string, 'abcdefg')
    }).to(function*(req, resp) {
      req.pipe(resp)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, 'abcdefg')
    }).promise()
  })

  it('should load response bodies', () => {
    return send({}).to({
      body: 'abcdefg',
    }).through('response', function*(req, resp) {
      yield resp._load()
      assert.strictEqual(resp.string, 'abcdefg')
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, 'abcdefg')
    }).promise()
  })

  // TODO: convert remainder of these tests to more compact send() utility.

  it('should set request bodies', () => {
    return send({
      path: 'http://example.com/',
      method: 'POST',
      body: 'abcdefg',
    }).through('request', function(req) {
      req.string = 'foobarbaz'
    }).to(function*(req, resp) {
      let body = yield streams.collect(req, 'utf8')
      assert.strictEqual(body, 'foobarbaz')
      resp.end('')
    }).promise()
  })

  it('should set response bodies', () => {
    return send({}).to({
      status: 200,
      body: 'abcdefg',
    }).through('response', function(req, resp) {
      resp.string = 'foobarbaz'
    }).receiving(function(resp) {
      assert.strictEqual(resp.body, 'foobarbaz')
    }).promise()
  })

  it('should have undefined values for things', () => {
    return send({}).through('request', function(req, resp) {
      assert.strictEqual(req.buffers, undefined)
      assert.strictEqual(req.string, undefined)
      assert.strictEqual(req.$, undefined)
      assert.strictEqual(req.json, undefined)
      assert.strictEqual(req.params, undefined)
      assert.strictEqual(resp.buffers, undefined)
      assert.strictEqual(resp.string, undefined)
      assert.strictEqual(resp.$, undefined)
      assert.strictEqual(resp.json, undefined)
      assert.strictEqual(resp.params, undefined)
    }).promise()
  })

  it('should intercept request buffer', () => {
    var body = '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'buffer',
    }, function*(req) {
      assert.ok(Buffer.isBuffer(req.buffer))
      assert.strictEqual(req.buffer.toString('utf8'), body)
    }).to(function*(req, resp) {
      let rBod = yield streams.collect(req, 'utf8')
      assert.strictEqual(rBod, body)
      resp.end('')
    }).promise()
  })

  it('should intercept response buffer', () => {
    var body = '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
    return send({}).to({ body }).through({
      phase: 'response',
      as: 'buffer',
    }, function*(req, resp) {
      assert.ok(Buffer.isBuffer(resp.buffer))
      assert.strictEqual(resp.buffer.toString('utf8'), body)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, body)
    }).promise()
  })

  it('should intercept request string', () => {
    var body = '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'string',
    }, function*(req) {
      assert.ok(typeof req.string === 'string')
      assert.strictEqual(req.string, body)
    }).to(function*(req, resp) {
      let rBod = yield streams.collect(req, 'utf8')
      assert.strictEqual(rBod, body)
      resp.end('')
    }).promise()
  })

  it('should intercept response string', () => {
    var body = '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
    return send({}).to({ body }).through({
      phase: 'response',
      as: 'string',
    }, function*(req, resp) {
      assert.ok(typeof resp.string === 'string')
      assert.strictEqual(resp.string, body)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, body)
    }).promise()
  })

  it('should intercept request params', () => {
    let params = { foo: 'bar', baz: 'qux qux' }
      , body = querystring.stringify(params)
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'params',
    }, function*(req) {
      assert.deepEqual(req.params, params)
    }).to(function*(req, resp) {
      let rBod = yield streams.collect(req, 'utf8')
      assert.strictEqual(rBod, body)
      resp.end('')
    }).promise()
  })

  it('should intercept response params', () => {
    let params = { foo: 'bar', baz: 'qux qux' }
      , body = querystring.stringify(params)
    return send({}).to({ body }).through({
      phase: 'response',
      as: 'params',
    }, function*(req, resp) {
      assert.deepEqual(resp.params, params)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, body)
    }).promise()
  })

  it('should intercept request json', () => {
    let json = { foo: 'bar', baz: 'qux qux' }
      , body = JSON.stringify(json)
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'json',
    }, function*(req) {
      assert.deepEqual(req.json, json)
    }).to(function*(req, resp) {
      let rBod = yield streams.collect(req, 'utf8')
      assert.strictEqual(rBod, body)
      resp.end('')
    }).promise()
  })

  it('should intercept response json', () => {
    let json = { foo: 'bar', baz: 'qux qux' }
      , body = JSON.stringify(json)
    return send({}).to({ body }).through({
      phase: 'response',
      as: 'json',
    }, function*(req, resp) {
      assert.deepEqual(resp.json, json)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, body)
    }).promise()
  })

  it.skip('should load reddit', () => {
    return send({}).through('request', (req) => {
      req.hostname = 'www.reddit.com'
      req.port = 80
    }).through({
      phase: 'response',
      as: '$',
    }, (req, resp) => {
      resp.$('title').text('Unicorns!')
    }).promise()
  })

  it('should intercept response DOM', () => {
    return send({}).to({
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>',
    }).through({
      phase: 'response',
      mimeType: 'text/html',
      as: '$',
    }, (req, resp) => {
      resp.$('title').text('bar')
    }).receiving(function*(resp) {
      assert.equal(resp.body, '<!doctype html><html><head><title>bar</title></head><body><div id="content"></div></body></html>')
    }).promise()
  })

  it('should load a reddit-size page', () => {
    return send({}).to((req, resp) => {
      resp.writeHead(200, {
        'date': 'Tue, 07 Jul 2015 04:54:21 GMT',
        'content-type': 'text/html; charset=UTF-8',
        'connection': 'keep-alive',
        'set-cookie': '__cfduid=d584541646503d8561ef841d43c7e98ec1436244861; expires=Wed, 06-Jul-16 04:54:21 GMT; path=/; domain=.reddit.com; HttpOnly',
        'x-ua-compatible': 'IE=edge',
        'x-frame-options': 'SAMEORIGIN',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'vary': 'accept-encoding',
        'cache-control': 'no-cache',
        'x-moose': 'majestic',
        'cf-cache-status': 'HIT',
        'server': 'cloudflare-nginx',
        'cf-ray': '2020f36f3a35118f-DFW',
      })
      let reddit = fs.createReadStream(`${__dirname}/files/reddit.html`)
      reddit.pipe(resp)
    }).through({
      phase: 'response',
      as: '$',
    }, (req, resp) => {
      resp.$('title').text('Unicorns!')
    }).promise()
  })

  it('should send content length to server for string', () => {
    var body = 'abc'
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'string',
    }, function() {
      // nothing here
    }).to(function*(req, resp) {
      assert.equal(req.headers['content-length'], body.length)
      resp.end('')
    }).promise()
  })

  it('should send content length to server for $', () => {
    var body = '<html></html>'
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: '$',
    }, function() {
      // nothing here
    }).to(function*(req, resp) {
      assert.equal(req.headers['content-length'], body.length)
      resp.end('')
    }).promise()
  })

  it('should send content length to server for json', () => {
    var body = JSON.stringify({ foo: 'bar', baz: 2 })
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'json',
    }, function() {
      // nothing here
    }).to(function*(req, resp) {
      assert.equal(req.headers['content-length'], body.length)
      resp.end('')
    }).promise()
  })

  it('should send content length to server for params', () => {
    var body = 'foo=bar&baz=qux'
    return send({
      method: 'POST',
      body,
    }).through({
      phase: 'request',
      as: 'params',
    }, function() {
      // nothing here
    }).to(function*(req, resp) {
      assert.equal(req.headers['content-length'], body.length)
      resp.end('')
    }).promise()
  })

  it('should send content length to client for string', () => {
    var body = 'abcdefg'
    return send({}).to(function*(req, resp) {
      resp.end(body)
    }).through({
      phase: 'response',
      as: 'string',
    }, function() {
      // nothing here
    }).receiving(function*(resp) {
      assert.equal(resp.headers['content-length'], body.length)
    }).promise()
  })

  it('should send content length to client for $', () => {
    var body = '<html></html>'
    return send({}).to(function*(req, resp) {
      resp.end(body)
    }).through({
      phase: 'response',
      as: '$',
    }, function() {
      // nothing here
    }).receiving(function*(resp) {
      assert.equal(resp.headers['content-length'], body.length)
    }).promise()
  })

  it('should send content length to client for json', () => {
    var body = JSON.stringify({ foo: 'bar', baz: 2 })
    return send({}).to(function*(req, resp) {
      resp.end(body)
    }).through({
      phase: 'response',
      as: 'json',
    }, function() {
      // nothing here
    }).receiving(function*(resp) {
      assert.equal(resp.headers['content-length'], body.length)
    }).promise()
  })

  it('should send content length to client for params', () => {
    var body = 'foo=bar&baz=qux'
    return send({}).to(function*(req, resp) {
      resp.end(body)
    }).through({
      phase: 'response',
      as: 'params',
    }, function() {
      // nothing here
    }).receiving(function*(resp) {
      assert.equal(resp.headers['content-length'], body.length)
    }).promise()
  })

  it('should send html by default', () => {
    // This is valid html but *NOT* xml, because <br> is void.
    var body = '<html><br></html>'
    return send({}).to({ body }).through({
      phase: 'response',
      as: '$',
    }, function(req, resp) {
      assert.ok(resp.$ !== undefined)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, body, 'response was not parsed as html')
    }).promise()
  })

  it('should send xml for mime type xml', () => {
    // This is valid xml but *NOT* html, because <script> is not void.
    var body = '<html><body><script src="foo"/></body></html>'
    return send({}).to({
      headers: { 'content-type': 'text/xml' },
      body,
    }).through({
      phase: 'response',
      as: '$',
    }, function(req, resp) {
      assert.ok(resp.$ !== undefined)
    }).receiving(function*(resp) {
      assert.strictEqual(resp.body, body, 'response was not parsed as html')
    }).promise()
  })

  it('should parse as html for non-xml mime type', () => {
    var body = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><br>.</br></html>'
    return send({}).to({
      headers: { 'content-type': 'text/plain' },
      body,
    }).through({
      phase: 'response',
      as: '$',
    }, function(req, resp) {
      assert.ok(resp.$ !== undefined)
    }).receiving(function*(resp) {
        assert.ok(resp.body.indexOf('<br>.<br>') > -1, 'response was parsed as xml')
    }).promise()
  })

  it('should parse as html for non-xml mime type', () => {
    // This is valid xml, because all tags must be closed. But it is *NOT* valid html, because <br> is void.
    var body = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><br>.</br></html>'
    return send({}).to({
      headers: { 'content-type': 'text/xml' },
      body,
    }).through({
      phase: 'response',
      as: '$',
    }, function(req, resp) {
      assert.ok(resp.$ !== undefined)
    }).receiving(function*(resp) {
      assert.ok(resp.body.indexOf('<br>.</br>') > -1, 'response was parsed as html')
    }).promise()
  })
})
