/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var await = require('await')
var assert = require('assert')
var querystring = require('querystring')
var streams = require('../lib/streams')
var roundTrip = require('./lib/round-trip')

// ---------------------------

describe('Load data as type', function(){

  it('should load request bodies', function(done){
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: 'abcdefg'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        req._load(function(err){
          assert.strictEqual(req.string, 'abcdefg')
          next()
        })
      },
      server: function(req, body){
        assert.strictEqual(body, 'abcdefg')
        done()
      }
    })
  })

  it('should load response bodies', function(done){
    roundTrip({
      response: {
        status: 200,
        body: 'abcdefg'
      },
      error: function(err, mess){
        done(err)
      },
      responseIntercept: function(req, resp, next){
        resp._load(function(err){
          assert.strictEqual(resp.string, 'abcdefg')
          next()
        })
      },
      client: function(resp, body){
        assert.strictEqual(body, 'abcdefg')
        done()
      }
    })
  })

  it('should set request bodies', function(done){
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: 'abcdefg'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp){
        req.string = 'foobarbaz'
      },
      server: function(req, body){
        assert.strictEqual(body, 'foobarbaz')
        done()
      }
    })
  })

  it('should set response bodies', function(done){
    roundTrip({
      response: {
        status: 200,
        body: 'abcdefg'
      },
      error: function(err, mess){
        done(err)
      },
      responseIntercept: function(req, resp){
        resp.string = 'foobarbaz'
      },
      client: function(resp, body){
        assert.strictEqual(body, 'foobarbaz')
        done()
      }
    })
  })

  it('should have undefined values for things', function(done){
    roundTrip({
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request'},
        callback: function(req, resp){
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
          done()
        }
      }]
    })
  })

  it('should intercept request buffers', function(done){
    var aBody = '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>';
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: aBody
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'buffers'},
        callback: function(req, resp){
          assert.ok(req.buffers, 'req.buffers should exist')
          assert.strictEqual(req.buffers.join(''), aBody)
          req.buffers = [new Buffer('abcdef')]
        }
      }],
      server: function(req, body){
        assert.strictEqual(body, 'abcdef')
        done()
      }
    })
  })

  it('should intercept request string', function(done){
    var aBody = '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>';
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: aBody
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'string'},
        callback: function(req, resp){
          assert.ok(req.string, 'req.string should exist')
          assert.strictEqual(req.string, aBody)
          req.string = 'abcdef'
        }
      }],
      server: function(req, body){
        assert.strictEqual(body, 'abcdef')
        done()
      }
    })
  })

  it('should intercept request params', function(done){
    var aBody = 'foo=bar&foo%20bar=qux';
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: aBody
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'params'},
        callback: function(req, resp){
          assert.ok(req.params, 'req.params should exist')
          assert.strictEqual(req.params.foo, 'bar')
          assert.strictEqual(req.params['foo bar'], 'qux')
          req.params = {a:'b'}
        }
      }],
      server: function(req, body){
        assert.strictEqual(body, querystring.stringify({a:'b'}))
        done()
      }
    })
  })

  it('should intercept request JSON', function(done){
    var aObj = {a:1,b:2}
    var aBody = JSON.stringify(aObj)
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: aBody
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'json'},
        callback: function(req, resp){
          assert.ok(req.json, 'req.json should exist')
          assert.strictEqual(req.json.a, 1)
          assert.strictEqual(req.json.b, 2)
          req.json.a = 0
        }
      }],
      server: function(req, body){
        assert.strictEqual(body, JSON.stringify({a:0,b:2}))
        done()
      }
    })
  })

  it('should intercept response buffers', function(done){
    roundTrip({
      response: {
        statusCode: 200,
        body: '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'buffers'},
        callback: function(req, resp){
          //try{
          assert.ok(resp.buffers, 'resp.buffers should exist')
          resp.buffers = [new Buffer('abcdef')]
        }
      }],
      client: function(resp, body){
        assert.strictEqual(body, 'abcdef')
        done()
      }
    })
  })

  it('should intercept response string', function(done){
    roundTrip({
      response: {
        statusCode: 200,
        body: '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'string'},
        callback: function(req, resp){
          //try{
          assert.ok(resp.string, 'resp.string should exist')
          resp.string = 'abcdef'
        }
      }],
      client: function(resp, body){
        assert.strictEqual(body, 'abcdef')
        done()
      }
    })
  })

  it('should intercept response DOM', function(done){
    roundTrip({
      response: {
        statusCode: 200,
        body: '<!doctype html><html><head><title>foo</title></head><body><div id="content"></div></body></html>'
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'$'},
        callback: function(req, resp){
          //try{
          assert.ok(resp.$, '$ should exist')
          assert.strictEqual(resp.$('title').text(), 'foo')
          resp.$('title').text('bar')
          //}catch(err){console.log(err)}
        }
      }],
      client: function(resp, body){
        assert.strictEqual(body, '<!doctype html><html><head><title>bar</title></head><body><div id="content"></div></body></html>')
        done()
      }
    })
  })

  it('should intercept response JSON', function(done){
    roundTrip({
      response: {
        statusCode: 200,
        body: JSON.stringify({foo:'bar',baz:2})
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'json'},
        callback: function(req, resp){
          assert.ok(resp.json, 'json should exist')
          assert.deepEqual(resp.json, {foo:'bar',baz:2})
          resp.json.qux = {};
        }
      }],
      client: function(resp, body){
        assert.deepEqual(JSON.parse(body), {foo:'bar',baz:2,qux:{}})
        done()
      }
    })
  })

  it('should send content length to server for string', function(done){
    var bod = 'abc'
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'string'},
        callback: function(req, resp){
          assert.ok(req.string !== undefined)
        }
      }],
      server: function(req, body){
        assert.strictEqual(req.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to server for $', function(done){
    var bod = '<html></html>'
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'$'},
        callback: function(req, resp){
          assert.ok(req.$ !== undefined)
        }
      }],
      server: function(req, body){
        assert.strictEqual(req.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to server for json', function(done){
    var bod = JSON.stringify({foo:'bar',baz:2})
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'json'},
        callback: function(req, resp){
          assert.ok(req.json !== undefined)
        }
      }],
      server: function(req, body){
        assert.strictEqual(req.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to server for params', function(done){
    var bod = 'foo=bar&baz=qux'
    roundTrip({
      request: {
        url: '/',
        method: 'POST',
        body: 'foo=bar&baz=qux'
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'request',as:'params'},
        callback: function(req, resp){
          assert.ok(req.params !== undefined)
        }
      }],
      server: function(req, body){
        assert.strictEqual(req.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to client for string', function(done){
    var bod = 'abcdefg'
    roundTrip({
      response: {
        statusCode: 200,
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'string'},
        callback: function(req, resp){
          assert.ok(resp.string !== undefined)
        }
      }],
      client: function(resp, body){
        assert.strictEqual(resp.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to client for $', function(done){
    var bod = '<html></html>'
    roundTrip({
      response: {
        statusCode: 200,
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'$'},
        callback: function(req, resp){
          assert.ok(resp.$ !== undefined)
        }
      }],
      client: function(resp, body){
        assert.strictEqual(resp.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to client for json', function(done){
    var bod = JSON.stringify({foo:'bar',baz:2})
    roundTrip({
      response: {
        statusCode: 200,
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'json'},
        callback: function(req, resp){
          assert.ok(resp.json !== undefined)
        }
      }],
      client: function(resp, body){
        assert.strictEqual(resp.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send content length to client for params', function(done){
    var bod = 'foo=bar&baz=qux'
    roundTrip({
      response: {
        statusCode: 200,
        body: bod
      },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'params'},
        callback: function(req, resp){
          assert.ok(resp.params !== undefined)
        }
      }],
      client: function(resp, body){
        assert.strictEqual(resp.headers['content-length'], bod.length.toString())
        done()
      }
    })
  })

  it('should send html by default', function(done){
    // This is valid html but *NOT* xml, because <br> is void.
    var bod = '<html><br></html>'
    roundTrip({
      request: { url: '/' },
      response: { body: bod },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'$'},
        callback: function(req, resp){
          assert.ok(resp.$ !== undefined)
        }
      }],
      client: function(resp, body){
        assert.strictEqual(body, bod, 'response was not parsed as html')
        done()
      }
    })
  })

  it('should send xml for mime type xml', function(done){
    // This is valid xml but *NOT* html, because <script> is not void.
    var bod = '<html><body><script src="foo"/></body></html>'
    roundTrip({
      request: { url: '/' },
      response: { body: bod, headers: {'content-type':'text/xml'} },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'$'},
        callback: function(req, resp){
          assert.ok(resp.$ !== undefined)
        }
      }],
      client: function(resp, body){
        assert.strictEqual(body, bod, 'response was not parsed as xml')
        done()
      }
    })
  })

  it('should parse as html for non-xml mime type', function(done){
    var bod = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html><br>.</br></html>'
    roundTrip({
      request: { url: '/' },
      response: { body: bod, headers: {'content-type':'text/plain'} },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'$'},
        callback: function(req, resp){
          assert.ok(resp.$ !== undefined)
        }
      }],
      client: function(resp, body){
        assert.ok(body.indexOf('<br>.<br>') > -1, 'response was parsed as xml')
        done()
      }
    })
  })

  it('should parse as xml for mime type xml', function(done){
    // This is valid xml, because all tags must be closed. But it is *NOT* valid html, because <br> is void.
    var bod = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"><html><br>.</br></html>'
    roundTrip({
      request: { url: '/' },
      response: { body: bod, headers: {'content-type':'text/xml'} },
      error: function(err, mess){
        done(err)
      },
      intercepts: [{
        opts: {phase:'response',as:'$'},
        callback: function(req, resp){
          assert.ok(resp.$ !== undefined)
        }
      }],
      client: function(resp, body){
        assert.ok(body.indexOf('<br>.</br>') > -1, 'response was parsed as html')
        done()
      }
    })
  })
})
