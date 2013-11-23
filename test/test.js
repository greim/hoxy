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

describe('Request', function(){

  it('should construct', function(){
    var request = new Request()
  })

  it('should accept raw data', function(){
    var req = new Request()
    req.setHttpSource(getRequestData())
  })

  it('should get and set protocol', function(){
    var req = new Request()
    req.setHttpSource(getRequestData())
    assert.strictEqual(req.protocol, 'http:')
    req.protocol = 'https:'
    assert.strictEqual(req.protocol, 'https:')
  })

  it('should get and set hostname', function(){
    var req = new Request()
    req.setHttpSource(getRequestData())
    assert.strictEqual(req.hostname, 'example.com')
    req.hostname = 'www.example.com'
    assert.strictEqual(req.hostname, 'www.example.com')
    assert.throws(function(){
      req.hostname = ''
    }, Error)
  })

  it('should get and set port', function(){
    var req = new Request()
    req.setHttpSource(getRequestData())
    assert.strictEqual(req.port, 8080)
    req.port = '8081'
    assert.strictEqual(req.port, 8081)
    assert.throws(function(){
      req.port = 'zzz'
    }, Error)
  })

  it('should get and set method', function(){
    var req = new Request()
    req.setHttpSource(getRequestData())
    assert.strictEqual(req.method, 'GET')
    req.method = 'put'
    assert.strictEqual(req.method, 'PUT')
    assert.throws(function(){
      req.method = ''
    }, Error)
  })

  it('should get and set url', function(){
    var req = new Request()
    req.setHttpSource(getRequestData())
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
    req.setHttpSource(data)
    assert.deepEqual(req.headers, data.headers)
  })

  it('should get and set source', function(){
    var req = new Request()
    var data = getRequestData()
    req.setHttpSource(data)
    assert.deepEqual(req.source, data)
  })
})

describe('Response', function(){

  it('should construct', function(){
    var resp = new Response()
  })

  it('should accept raw data', function(){
    var resp = new Response()
    resp.setHttpSource(getResponseData())
  })

  it('should get and set headers', function(){
    var resp = new Response()
    var data = getResponseData()
    resp.setHttpSource(data)
    assert.deepEqual(resp.headers, data.headers)
  })

  it('should get and set status code', function(){
    var resp = new Response()
    resp.setHttpSource(getResponseData())
    assert.strictEqual(resp.statusCode, 200)
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
  for (var i=0; i<100; i++){
    buffs.push(new Buffer(pad(i,3),'ascii'))
  }

  it('should have a size', function(){
    var fake = streams.from(buffs)
    assert.strictEqual(fake.size(), 300)
  })

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
    .pipe(streams.brake(300,50))
    var chunks = []
    var start = Date.now()
    fake.on('data', function(buffer){
      chunks.push(buffer)
    })
    fake.on('end', function(){
      var time = Date.now() - start
      assert.ok(time > 45, 'stream throttler too fast. expected > '+45+', got '+time)
      assert.ok(time < 55, 'stream throttler too slow. expected < '+55+', got '+time)
      assert.strictEqual(chunks.join(''), buffs.join(''))
      done()
    })
  })
})
describe('Hoxy', function(){

  it('should round trip synchronously', function(done){
    var steps = ''
    roundTrip({
      error: function(err, mess){
        done(err)
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
        assert.strictEqual(steps, '123')
        done()
      }
    })
  })

  it('should round trip asynchronously', function(done){
    var steps = ''
    roundTrip({
      error: function(err, mess){
        done(err)
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
        assert.strictEqual(steps, '123')
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
      error: function(err, mess){
        done(err)
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
      error: function(err, mess){
        done(err)
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
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req){
        req.url = '/'
        req.headers['x-foo'] = 'baz'
      },
      server: function(req, body){
        assert.strictEqual(req.url, '/')
        done()
      }
    })
  })

  it('should modify data sent to the client', function(done){
    roundTrip({
      response:{
        statusCode: 200,
        body: 'abc',
        headers: {
          'x-foo': 'bar'
        }
      },
      error: function(err, mess){
        done(err)
      },
      responseIntercept: function(req, resp){
        resp.statusCode = 234
        resp.headers['x-foo'] = 'baz'
      },
      client: function(resp, body){
        assert.strictEqual(resp.statusCode, 234)
        assert.strictEqual(resp.headers['x-foo'], 'baz')
        done()
      }
    })
  })

  it('should behave asynchronously in the request phase', function(done){
    roundTrip({
      error: function(err, mess){
        done(err)
      },
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
      error: function(err, mess){
        done(err)
      },
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
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp){
        resp.statusCode = 404
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(){
        done()
      }
    })
  })

  it('should serve', function(done){
    roundTrip({
      request:{
        url: '/abc',
        method: 'GET'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        this.serve('./files', function(){
          next();
        })
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(resp, body){
        assert.strictEqual(body, 'abc')
        done()
      }
    })
  })

  it('should not fallback silently with serve', function(done){
    roundTrip({
      request:{
        url: '/def',
        method: 'GET'
      },
      response:{
        statusCode: 200,
        body: 'def'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        this.serve('./files', function(){
          next();
        })
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(resp, body){
        assert.strictEqual(body, '')
        assert.strictEqual(resp.statusCode, 404)
        done()
      }
    })
  })

  it('should ghost serve', function(done){
    roundTrip({
      request:{
        url: '/abc',
        method: 'GET'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        this.ghostServe('./files', function(){
          next();
        })
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(resp, body){
        assert.strictEqual(body, 'abc')
        done()
      }
    })
  })

  it('should fallback silently with ghost serve', function(done){
    var serverHit = false;
    roundTrip({
      request:{
        url: '/def',
        method: 'GET'
      },
      response:{
        statusCode: 200,
        body: 'def'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        this.ghostServe('./files', function(){
          next();
        })
      },
      server: function(){
        serverHit = true;
      },
      client: function(resp, body){
        assert.strictEqual(body, 'def')
        assert.ok(serverHit);
        done()
      }
    })
  })
})


