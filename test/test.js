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
var serializer = require('../lib/serializer')
var streams = require('../lib/streams')
var roundTrip = require('./round-trip')

// ---------------------------

var getMegaSource = (function(){
  var hex = '0123456789abcdef'
  var kb = []
  for (var i=0; i<64; i++)
    kb.push(hex)
  kb = kb.join('')
  return function(){
    var result = []
    for (var i=0; i<1000; i++)
      result.push(new Buffer(kb, 'utf8'))
    return streams.from(result)
  }
})()

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

  it('should get absolute URL', function(){
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
})

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

describe('serializer', function(){

  it('should work', function(done){
    var callCount = 0,
    arr = [0,0,0,0]
    serializer.serialize(arr, function(item, next){
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

  it('should brake a stream', function(done){
    var start = Date.now();
    var fake = streams.from([new Buffer('abcdefg')]);
    var brake = streams.brake(1, 100);
    var piped = fake.pipe(brake);
    streams.collect(piped)
    .onfail(function(err){
      done(err);
    })
    .onkeep(function(got){
      var stop = Date.now();
      var lower = 700-20;
      var upper = 700+20;
      var time = stop - start;
      //console.log(time)
      assert.ok(time < upper, 'took too long, expected < '+upper+', got '+time);
      assert.ok(time > lower, 'took too short, expected > '+lower+', got '+time);
      assert.strictEqual(got.buffers.join(''),'abcdefg');
      done();
    });
  })

  it('should brake a big stream', function(done){
    var start = Date.now();
    var fake = getMegaSource();
    var brake = streams.brake(10240, 10);
    var piped = fake.pipe(brake);
    streams.collect(piped)
    .onfail(function(err){
      done(err);
    })
    .onkeep(function(){
      var stop = Date.now();
      var lower = 1000-300;
      var upper = 1000+300;
      var time = stop - start;
      assert.ok(time < upper, 'took too long, expected < '+upper+', got '+time);
      assert.ok(time > lower, 'took too short, expected > '+lower+', got '+time);
      done();
    });
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
      requestSentIntercept: function(){
        steps += '2'
      },
      server: function(){
        steps += '3'
      },
      responseIntercept: function(){
        steps += '4'
      },
      responseSentIntercept: function(){
        steps += '5'
      },
      client: function(){
        assert.strictEqual(steps, '12345')
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
        },0)
      },
      requestSentIntercept: function(req, resp, itsDone){
        setTimeout(function(){
          steps += '2'
          itsDone()
        },0)
      },
      responseIntercept: function(req, resp, itsDone){
        setTimeout(function(){
          steps += '3'
          itsDone()
        },0)
      },
      responseSentIntercept: function(req, resp, itsDone){
        setTimeout(function(){
          steps += '4'
          itsDone()
        },0)
      },
      client: function(){
        setTimeout(function(){
          assert.strictEqual(steps, '1234')
          done()
        },10)
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
        this.ghost('./files', function(){
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
        this.ghost('./files', function(){
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

  it('should simulate latency upload', function(done){

    var start, end
    roundTrip({
      request:{
        url: '/def',
        method: 'POST'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp){
        req.slow({ latency: 100 })
        start = Date.now()
      },
      server: function(){
        end = Date.now()
        var upper = 100+100,
          lower = 100-1,
          actual = end - start
        assert.ok(actual > lower, 'latency should be above '+lower+'ms (was '+actual+')')
        assert.ok(actual < upper, 'latency should be below '+upper+'ms (was '+actual+')')
        done()
      }
    })
  })

  it('should simulate latency download', function(done){

    var start, end
    roundTrip({
      response:{
        statusCode: 200
      },
      error: function(err, mess){
        done(err)
      },
      responseIntercept: function(req, resp){
        resp.slow({ latency: 100 })
        start = Date.now()
      },
      client: function(){
        end = Date.now()
        var upper = 110,
          lower = 90,
          actual = end - start
        assert.ok(actual > lower, 'latency should be above '+lower+'ms (was '+actual+')')
        assert.ok(actual < upper, 'latency should be below '+upper+'ms (was '+actual+')')
        done()
      }
    })
  })

  it('should simulate slow upload', function(done){

    var start, end
    roundTrip({
      request:{
        url: '/def',
        method: 'POST'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp){
        req._source = getMegaSource()
        req.slow({ rate: 1024000 })
        start = Date.now()
      },
      server: function(req, body){
        end = Date.now()
        assert.strictEqual(body.length, 1024000)
        var upper = 1000+100,
          lower   = 1000-100,
          actual = end - start
        assert.ok(actual > lower, 'transfer time should be above '+lower+'ms (was '+actual+')')
        assert.ok(actual < upper, 'transfer time should be below '+upper+'ms (was '+actual+')')
        done()
      }
    })
  })

  it('should simulate slow download', function(done){

    var start, end
    roundTrip({
      response:{
        statusCode: 200
      },
      error: function(err, mess){
        done(err)
      },
      responseIntercept: function(req, resp){
        resp._source = getMegaSource()
        resp.slow({ rate: 1024000 })
        start = Date.now()
      },
      client: function(resp, body){
        end = Date.now()
        assert.strictEqual(body.length, 1024000)
        var upper = 1100,
          lower = 950,
          actual = end - start
        assert.ok(actual > lower, 'transfer time should be above '+lower+'ms (was '+actual+')')
        assert.ok(actual < upper, 'transfer time should be below '+upper+'ms (was '+actual+')')
        done()
      }
    })
  })

  it('should get and set data', function(done){
    roundTrip({
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp){
        this.data('foo3','bar3')
        assert.strictEqual(this.data('foo3'), 'bar3')
      },
      requestSentIntercept: function(req, resp){
        assert.strictEqual(this.data('foo3'), 'bar3')
      },
      responseIntercept: function(req, resp){
        assert.strictEqual(this.data('foo3'), 'bar3')
      },
      responseSentIntercept: function(req, resp){
        assert.strictEqual(this.data('foo3'), 'bar3')
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
})


