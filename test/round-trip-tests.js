/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var await = require('await')
var fs = require('fs')
var assert = require('assert')
var streams = require('../lib/streams')
var roundTrip = require('./lib/round-trip')

// ---------------------------

// return a writable stream that will
// write a megabyte worth of data
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
        this.serve({
          docroot: __dirname+'/files'
        }, function(){
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
        this.serve({
          docroot: __dirname+'/files'
        }, function(){
          next();
        })
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(resp, body){
        assert.strictEqual(body, '')
        assert.strictEqual(resp.statusCode, 404, 'should have been 404 but was '+resp.statusCode)
        done()
      }
    })
  })

  it('should serve with overlay strategy', function(done){
    roundTrip({
      request:{
        url: '/abc',
        method: 'GET'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        this.serve({
          docroot:__dirname+'/files',
          strategy: 'overlay'
        }, function(){
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

  it('should fallback silently with overlay strategy', function(done){
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
        this.serve({
          docroot:__dirname+'/files',
          strategy: 'overlay'
        }, function(){
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

  it('should mirror with mirror strategy', function(done){
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
        this.serve({
          docroot:__dirname+'/files',
          strategy: 'mirror'
        }, function(err){
          var file = __dirname+'/files/def'
          fs.exists(file, function(exists){
            if (exists){
              next(err)
            } else {
              next(new Error('did not create '+file))
            }
          });
        })
      },
      server: function(){
        serverHit = true;
      },
      client: function(resp, body){
        assert.strictEqual(body, 'def')
        done()
      }
    })
  })

  it('should not re-mirror with mirror strategy', function(done){
    var serverHit = false;
    roundTrip({
      request:{
        url: '/abc',
        method: 'GET'
      },
      response:{
        statusCode: 200,
        body: 'abc2'
      },
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp, next){
        this.serve({
          docroot:__dirname+'/files',
          strategy: 'mirror'
        }, function(err){
          var file = __dirname+'/files/def'
          fs.exists(file, function(exists){
            if (exists){
              next(err)
            } else {
              next(new Error('did not create '+file))
            }
          });
        })
      },
      server: function(){
        serverHit = true;
      },
      client: function(resp, body){
        assert.strictEqual(body, 'abc')
        assert.ok(!serverHit, 'should not have hit server');
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

var files = [
  './files/def'
]
function removeFiles(done){
  var fileProms = files.map(function(file){
    return await('done')
    .run(function(p){
      fs.exists(file, function(ex){
        if (ex){
          fs.unlink(file, p.nodify('done'))
        } else {
          p.keep('done')
        }
      })
    })
  })
  await.all(fileProms)
  .onkeep(function(){done()})
  .onfail(done)
}
before(removeFiles)
after(removeFiles)
