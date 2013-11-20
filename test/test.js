/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var url = require('url')
var assert = require('assert')
var Request = require('../lib/request')
var Response = require('../lib/response')
var serialize = require('../lib/serializer')
var streams = require('../lib/streams')
var roundTrip = require('./round-trip')

// ---------------------------

var rawRequestData = {
  protocol: 'http:',
  hostname: 'example.com',
  port: 8080,
  method: 'GET',
  url: '/foo.html',
  headers: {
    'host': 'example.com:8080',
    'origin': 'http://example.com:8080',
    'referer': 'http://example.com:8080/',
    'content-type': 'text/html; charset=utf-8',
    'cookie': 'foo=bar; buz%20yak=baz%20qux'
  },
  buffers: [
    new Buffer('<!doctype html><html><head></head><body>', 'utf8'),
    new Buffer('<p>foo</p>', 'utf8'),
    new Buffer('</body></html>', 'utf8')
  ]
}

var rawRequestDataQS = {
  protocol: 'http:',
  hostname: 'example.com',
  port: 8080,
  method: 'GET',
  url: '/foo.html?bar=baz&foo=qux',
  headers: {
    'host': 'example.com:8080',
    'origin': 'http://example.com:8080',
    'referer': 'http://example.com:8080/',
    'content-type': 'text/html; charset=utf-8',
    'cookie': 'foo=bar; buz%20yak=baz%20qux'
  },
  buffers: [
    new Buffer('<!doctype html><html><head></head><body>', 'utf8'),
    new Buffer('<p>foo</p>', 'utf8'),
    new Buffer('</body></html>', 'utf8')
  ]
}

var rawRequestDataPost = {
  protocol: 'http:',
  hostname: 'example.com',
  port: 8080,
  method: 'POST',
  url: '/foo.html',
  headers: {
    'host': 'example.com:8080',
    'origin': 'http://example.com:8080',
    'referer': 'http://example.com:8080/',
    'content-type': 'text/html; charset=utf-8',
    'cookie': 'foo=bar; buz%20yak=baz%20qux'
  },
  buffers: [
    new Buffer('bar=baz&foo%20x=qux%20x', 'utf8')
  ]
}

var responseBuffers = [
  new Buffer('<!doctype html><html><head></head><body>', 'utf8'),
  new Buffer('<p>foo</p>', 'utf8'),
  new Buffer('</body></html>', 'utf8')
]

var responseHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'content-length': responseBuffers.reduce(function(tally, buf){return tally+buf.length},0)
}

var rawResponseData = {
  statusCode: 200,
  headers: responseHeaders,
  buffers: responseBuffers
}

var headers = rawRequestData.headers

function j(obj){
  return JSON.stringify(obj)
}


describe('Request', function(){

  it('should construct', function(){
    var request = new Request()
  })

  it('should accept raw data', function(){
    var request = new Request()
    request.setRawData(rawRequestData)
    assert.ok(true)
  })

  it('should get and set protocol', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.protocol, 'http:')
    req.protocol = 'https:'
    assert.strictEqual(req.protocol, 'https:')
  })

  it('should get and set hostname', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.hostname, 'example.com')
    req.hostname = 'www.example.com'
    assert.strictEqual(req.hostname, 'www.example.com')
    assert.throws(function(){
      req.hostname = ''
    }, Error)
  })

  it('should get and set port', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.port, 8080)
    req.port = '8081'
    assert.strictEqual(req.port, 8081)
    assert.throws(function(){
      req.port = 'zzz'
    }, Error)
  })

  it('should get and set method', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.method, 'GET')
    req.method = 'put'
    assert.strictEqual(req.method, 'PUT')
    assert.throws(function(){
      req.method = ''
    }, Error)
  })

  it('should get and set url', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.url, '/foo.html')
    req.url = '/bar.html'
    assert.strictEqual(req.url, '/bar.html')
    assert.throws(function(){
      req.url = 'zzz'
    }, Error)
  })

  it('should get and set headers', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.ok(req.headers !== headers)
    assert.deepEqual(req.headers, headers)
  })

  it('should get and set buffers', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.buffers.length, 3)
    assert.throws(function(){
      req.buffers = 'foo:'
    }, Error)
  })

  it('should get and set host', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getHost(), 'example.com:8080')
    req.setHost('example.biz:8081')
    assert.strictEqual(req.getHost(), 'example.biz:8081')
    assert.strictEqual(req.hostname, 'example.biz')
    assert.strictEqual(req.port, 8081)
    req.port = 8080
    assert.strictEqual(req.getHost(), 'example.biz:8080')
    assert.throws(function(){
      req.setHost('foo:bar')
    }, Error)
  })

  it('should handle undefined port', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    req.setHost('foo.com')
    assert.ok(req.port === undefined)
    assert.strictEqual(req.getAbsUrl(), 'http://foo.com/foo.html')
    req.setHost('foo.com:80')
    assert.ok(req.port === 80)
    assert.strictEqual(req.getAbsUrl(), 'http://foo.com:80/foo.html')
    req.port = undefined
    assert.ok(req.port === undefined)
    assert.strictEqual(req.getAbsUrl(), 'http://foo.com/foo.html')
  })

  it('should get and set abs url', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getAbsUrl(), 'http://example.com:8080/foo.html')
    req.setAbsUrl('https://example.biz:8081/bar.html')
    assert.strictEqual(req.getHost(), 'example.biz:8081')
    assert.strictEqual(req.protocol, 'https:')
    assert.strictEqual(req.url, '/bar.html')
  })

  it('should get and set filename', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getFilename(), 'foo.html')
    req.setFilename('bar.html')
    assert.strictEqual(req.url, '/bar.html')
  })

  it('should get and set extension', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getExtension(), 'html')
    req.setExtension('js')
    assert.strictEqual(req.url, '/foo.js')
  })

  it('should get and set origin', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getOrigin(), headers.origin)
    req.setOrigin('foo')
    assert.strictEqual(req.headers.origin, 'foo')
  })

  it('should get and set referrer', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getReferrer(), headers.referer)
    req.setReferrer('foo')
    assert.strictEqual(req.headers.referer, 'foo')
  })

  it('should get and set content type', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getContentType(), 'text/html')
    req.setContentType('text/javascript')
    assert.strictEqual(req.headers['content-type'], 'text/javascript; charset=utf-8')
  })

  it('should get and set encoding', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getEncoding(), 'utf-8')
    req.setEncoding('ascii')
    assert.strictEqual(req.headers['content-type'], 'text/html; charset=ascii')
  })

  it('should get and set body', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    assert.strictEqual(req.getBody(), '<!doctype html><html><head></head><body><p>foo</p></body></html>')
    req.setBody('123456789')
    assert.strictEqual(req.buffers.join(''), '123456789')
  })

  it('should get and set json', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    req.setJson({foo:'bar'})
    assert.deepEqual(req.getJson(), {foo:'bar'})
    assert.strictEqual(req.body, JSON.stringify({foo:'bar'}))
  })

  it('should get parsed url', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    var purl = req.getParsedUrl()
    assert.strictEqual(purl.hostname, 'example.com')
  })

  it('should get and set cookie', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    var cookie = req.getCookies()
    assert.deepEqual(cookie, {foo:'bar','buz yak':'baz qux'})
    cookie.pop = 'wax'
    req.setCookies(cookie)
    assert.strictEqual(req.headers.cookie, 'foo=bar; buz%20yak=baz%20qux; pop=wax')
  })

  it('should get set and url params', function(){
    var req = new Request()
    req.setRawData(rawRequestDataQS)
    var params = req.getUrlParams()
    assert.deepEqual(params, {foo:'qux',bar:'baz'})
    params.pop = 'wax'
    req.setUrlParams(params)
    assert.deepEqual(params, req.getUrlParams())
  })

  it('should get and set dom', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    var $ = req.getDom()
    assert.strictEqual($('p').text(), 'foo')
    $('p').text('bar')
    req.setDom($)
    assert.strictEqual(req.getBody(), '<!doctype html><html><head></head><body><p>bar</p></body></html>')
  })

  it('should get and set body params', function(){
    var req = new Request()
    req.setRawData(rawRequestDataPost)
    var params = req.getBodyParams()
    assert.deepEqual(params, {bar:'baz','foo x':'qux x'})
    params.bar = 'biz'
    req.setBodyParams(params)
    assert.deepEqual(req.getBodyParams(), {bar:'biz','foo x':'qux x'})
  })

  it('should get and set individual cookies', function(){
    var req = new Request()
    req.setRawData(rawRequestData)
    var c = req.cookie('buz yak')
    assert.strictEqual(c, 'baz qux')
    assert.strictEqual(req.headers.cookie, 'foo=bar; buz%20yak=baz%20qux')
    var newCookie = '%()%))'
    req.cookie('buz yak', newCookie)
    assert.strictEqual(req.cookie('buz yak'), newCookie)
    assert.strictEqual(req.headers.cookie, 'foo=bar; buz%20yak=%25()%25))')
  })

  it('should get and set individual url params', function(){
    var req = new Request()
    req.setRawData(rawRequestDataQS)
    //bar=baz&foo=qux
    var p = req.urlParam('bar')
    assert.strictEqual(p, 'baz')
    assert.deepEqual(req.getUrlParams(), {bar:'baz',foo:'qux'})
    var newParam = '%()%))'
    req.urlParam('bar', newParam)
    assert.strictEqual(req.urlParam('bar'), newParam)
    assert.deepEqual(req.getUrlParams(), {bar:newParam,foo:'qux'})
  })

  it('should get and set individual body params', function(){
    var req = new Request()
    req.setRawData(rawRequestDataPost)
    //bar=baz&foo%20x=qux%20x
    var p = req.bodyParam('foo x')
    assert.strictEqual(p, 'qux x')
    assert.deepEqual(req.getBodyParams(), {'bar':'baz','foo x':'qux x'})
    var newParam = '%()%))'
    req.bodyParam('bar', newParam)
    assert.strictEqual(req.bodyParam('bar'), newParam)
    assert.deepEqual(req.getBodyParams(), {bar:newParam,'foo x':'qux x'})
  })
})

describe('Response', function(){

  it('should construct', function(){
    var resp = new Response()
  })

  it('should accept raw data', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
  })

  it('should get and set headers', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    assert.ok(resp.headers !== responseHeaders)
    assert.deepEqual(resp.headers, responseHeaders)
  })

  it('should get and set buffers', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    assert.strictEqual(resp.buffers.length, 3)
  })

  it('should get and set content type', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    assert.strictEqual(resp.getContentType(), 'text/html')
    resp.setContentType('text/javascript')
    assert.strictEqual(resp.headers['content-type'], 'text/javascript; charset=utf-8')
  })

  it('should get and set encoding', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    assert.strictEqual(resp.getEncoding(), 'utf-8')
    resp.setEncoding('ascii')
    assert.strictEqual(resp.headers['content-type'], 'text/html; charset=ascii')
  })

  it('should get and set body', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    assert.strictEqual(resp.getBody(), '<!doctype html><html><head></head><body><p>foo</p></body></html>')
    resp.setBody('123456789')
    assert.strictEqual(resp.buffers.join(''), '123456789')
  })

  it('should get and set json', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    resp.setJson({foo:'bar'})
    assert.deepEqual(resp.getJson(), {foo:'bar'})
    assert.strictEqual(resp.getBody(), JSON.stringify({foo:'bar'}))
  })

  it('should get and set dom', function(){
    var resp = new Response()
    resp.setRawData(rawResponseData)
    var $ = resp.getDom()
    assert.strictEqual($('p').text(), 'foo')
    $('p').text('bar')
    resp.setDom($)
    assert.strictEqual(resp.getBody(), '<!doctype html><html><head></head><body><p>bar</p></body></html>')
  })
})

describe('serializer', function(){

  it('should work', function(done){
    var callCount = 0,
    arr = [0,0,0,0]
    serialize(arr, function(item, next){
      callCount++
      setTimeout(next, 0)
    })
    .then(function(){
      assert.strictEqual(arr.length, callCount)
      done()
    })
    .catch(function(err){
      done(err)
    })
  })
})

describe('streams', function(){

  var buffs = []
  function pad(n,len){
    n = n+''
    while (n.length < len) n = '0' + n
    return n
  }
  for (var i=0; i<1000; i++){
    buffs.push(new Buffer(pad(i,3),'ascii'))
  }

  it('should wrap buffer lists', function(done){
    var fake = streams.from(buffs)
    var chunks = []
    fake.on('data', function(buffer){
      chunks.push(buffer)
    })
    fake.on('end', function(){
      assert.strictEqual(chunks.join(''), buffs.join(''))
      done()
    })
  })

  it('should throttle streams', function(done){
    var fake = streams
    .from(buffs)
    .pipe(streams.brake(3000,500))
    var chunks = []
    var start = Date.now()
    fake.on('data', function(buffer){
      chunks.push(buffer)
    })
    fake.on('end', function(){
      var time = Date.now() - start
      assert.ok(time > 490, 'stream throttler too fast. expected > '+490+', got '+time)
      assert.ok(time < 510, 'stream throttler too slow. expected < '+510+', got '+time)
      assert.strictEqual(chunks.join(''), buffs.join(''))
      done()
    })
  })
})

describe('Hoxy', function(){

  it('should round trip synchronously', function(done){
    var steps = ''
    roundTrip({
      startIntercept: function(){
        steps += '0'
      },
      requestIntercept: function(){
        steps += '1'
      },
      server: function(){
        steps += '2'
      },
      responseIntercept: function(){
        steps += '3'
      },
      client: function(){
        assert.strictEqual(steps, '0123')
        done()
      }
    })
  })

  it('should round trip asynchronously', function(done){
    var steps = ''
    roundTrip({
      startIntercept: function(req, resp, itsDone){
        setTimeout(function(){
          steps += '0'
          itsDone()
        },10)
      },
      requestIntercept: function(req, resp, itsDone){
        setTimeout(function(){
          steps += '1'
          itsDone()
        },10)
      },
      server: function(){
        steps += '2'
      },
      responseIntercept: function(req, resp, itsDone){
        setTimeout(function(){
          steps += '3'
          itsDone()
        },10)
      },
      client: function(){
        assert.strictEqual(steps, '0123')
        done()
      }
    })
  })

  it('should send body data to the server', function(done){
    roundTrip({
      request:{
        url: '/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
      },
      server: function(req, body){
        assert.strictEqual(req.url, '/foobar')
        assert.strictEqual(req.headers['x-foo'], 'bar')
        assert.strictEqual(body, 'abc')
        done()
      }
    })
  })

  it('should send body data to the client', function(done){
    roundTrip({
      response:{
        statusCode: 404,
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
      },
      client: function(resp, body){
        assert.strictEqual(resp.statusCode, 404)
        assert.strictEqual(resp.headers['x-foo'], 'bar')
        assert.strictEqual(body, 'abc')
        done()
      }
    })
  })

  it('should modify data sent to the server', function(done){
    roundTrip({
      request:{
        url: '/foobar',
        method: 'POST',
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
      },
      requestIntercept: function(req){
        req.setBody('123')
        req.url = '/'
        req.headers['x-foo'] = 'baz'
        req.urlParam('foo','bar')
        req.cookie('buz','baz')
      },
      server: function(req, body){
        assert.strictEqual(req.url, '/?foo=bar')
        assert.strictEqual(req.headers['x-foo'], 'baz')
        assert.strictEqual(req.headers['cookie'], 'buz=baz')
        assert.strictEqual(body, '123')
        done()
      }
    })
  })

  it('should modify data sent to the client', function(done){
    roundTrip({
      response:{
        statusCode: 404,
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
      },
      responseIntercept: function(req, resp){
        resp.statusCode = 200
        resp.setBody('123')
        resp.headers['x-foo'] = 'baz'
      },
      client: function(resp, body){
        assert.strictEqual(resp.statusCode, 200)
        assert.strictEqual(resp.headers['x-foo'], 'baz')
        assert.strictEqual(body, '123')
        done()
      }
    })
  })

  it('should behave asynchronously in the request phase', function(done){
    roundTrip({
      requestIntercept: function(req, resp, next){
        setTimeout(next,0)
      },
      server: function(){
        done()
      }
    })
  })

  it('should behave asynchronously in the response phase', function(done){
    roundTrip({
      responseIntercept: function(req, resp, next){
        setTimeout(next,0)
      },
      client: function(){
        done()
      }
    })
  })

  it('should skip the server hit if the response is populated', function(done){
    roundTrip({
      requestIntercept: function(req, resp){
        resp.setBody('hello')
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(){
        done()
      }
    })
  })

  it('should sanitize broken GET requests', function(done){
    roundTrip({
      request: {
        method: 'GET'
      },
      requestIntercept: function(req){
        req.body = '12345'
        req.headers.host = 'foo:3456'
        req.headers['content-type'] = 'text/garbage'
        req.headers['content-length'] = 999999999
      },
      server: function(req, body){
        assert.strictEqual(body, '')
        assert.strictEqual(req.headers.host, 'localhost:8282')
        assert.strictEqual(req.headers['content-type'], undefined)
        assert.strictEqual(req.headers['content-length'], undefined)
        done()
      }
    })
  })

  it('should sanitize broken POST requests', function(done){
    roundTrip({
      request: {
        method: 'POST',
        body: 'abc'
      },
      requestIntercept: function(req){
        req.headers['content-length'] = 999999999
      },
      server: function(req, body){
        assert.equal(req.headers['content-length'], new Buffer(body, 'utf8').length)
        done()
      }
    })
  })

  it('should sanitize broken responses', function(done){
    roundTrip({
      requestIntercept: function(req, resp){
        resp.headers['content-length'] = 999999999
      },
      client: function(resp, body){
        assert.equal(resp.headers['content-length'], new Buffer(body, 'utf8').length)
        done()
      }
    })
  })

  it('should sanitize broken empty responses', function(done){
    roundTrip({
      response: {
        body: ''
      },
      responseIntercept: function(req, resp){
        resp.headers['content-length'] = 999999999
      },
      client: function(resp, body){
        assert.strictEqual(resp.headers['content-length'], undefined)
        done()
      }
    })
  })

  it('should pipe request bodies', function(done){
    var alpha = 'abcdefghijklmnopqrstuvwzyz'
    var warning = false
    roundTrip({
      request: {
        method: 'POST',
        body: alpha
      },
      startIntercept: function(req){
        req.pipe()
        req.on('log', function(log){
          if (log.level === 'warn')
            warning = true
        })
      },
      requestIntercept: function(req){
        req.setBody('x')
      },
      server: function(req, body){
        assert.strictEqual(body, alpha)
        assert.ok(warning, 'attempt to access piped body failed to emit warning')
        done()
      }
    })
  })

  it('should pipe response bodies', function(done){
    var alpha = 'abcdefghijklmnopqrstuvwzyz'
    var warning = false
    roundTrip({
      response: {
        statusCode: 200,
        body: alpha
      },
      startIntercept: function(req, resp){
        resp.pipe()
        resp.on('log', function(log){
          if (log.level === 'warn')
            warning = true
        })
      },
      responseIntercept: function(req, resp){
        resp.setBody('x')
      },
      client: function(resp, body){
        assert.strictEqual(body, alpha)
        assert.ok(warning, 'attempt to access piped body failed to emit warning')
        done()
      }
    },true)
  })

  it('should pipe response bodies set during the request phase', function(done){
    var alpha = 'abcdefghijklmnopqrstuvwzyz'
    var warning = false
    roundTrip({
      response: {
        statusCode: 200,
        body: alpha
      },
      requestIntercept: function(req, resp){
        resp.pipe()
        resp.on('log', function(log){
          if (log.level === 'warn')
            warning = true
        })
      },
      responseIntercept: function(req, resp){
        resp.setBody('x')
      },
      client: function(resp, body){
        assert.strictEqual(body, alpha)
        assert.ok(warning, 'attempt to access piped body failed to emit warning')
        done()
      }
    },true)
  })
})



