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

  it('should handle a synchronous request intercept error gracefully', function(done){
    var error = false,
      reqInt = false,
      respInt = false,
      server = false
    roundTrip({
      error: function(err, mess){
        error = true
      },
      requestIntercept: function(req, resp){
        reqInt = true
        throw new Error('fake error')
      },
      responseIntercept: function(req, resp){
        respInt = true
      },
      server: function(){
        server = true
      },
      client: function(){
        assert.ok(error, 'error should have occurred')
        assert.ok(reqInt, 'request intercept should have occurred')
        assert.ok(server, 'server hit should have occurred')
        assert.ok(respInt, 'response intercept should have occurred')
        done()
      }
    })
  })

  it('should handle a synchronous response intercept error gracefully', function(done){
    var error = false,
      reqInt = false,
      respInt = false,
      server = false
    roundTrip({
      error: function(err, mess){
        error = true
      },
      requestIntercept: function(req, resp){
        reqInt = true
      },
      responseIntercept: function(req, resp){
        respInt = true
        throw new Error('fake error')
      },
      server: function(){
        server = true
      },
      client: function(a,b){
        assert.ok(error, 'error should have occurred')
        assert.ok(reqInt, 'request intercept should have occurred')
        assert.ok(server, 'server hit should have occurred')
        assert.ok(respInt, 'response intercept should have occurred')
        done()
      }
    })
  })

  it('should handle an asynchronous request intercept error gracefully', function(done){
    var error = false,
      reqInt = false,
      respInt = false,
      server = false
    roundTrip({
      error: function(err, mess){
        error = true
      },
      requestIntercept: function(req, resp, next){
        reqInt = true
        setTimeout(function(){
          next(new Error('fake error'))
        },0);
      },
      responseIntercept: function(req, resp){
        respInt = true
      },
      server: function(){
        server = true
      },
      client: function(){
        assert.ok(error, 'error should have occurred')
        assert.ok(reqInt, 'request intercept should have occurred')
        assert.ok(server, 'server hit should have occurred')
        assert.ok(respInt, 'response intercept should have occurred')
        done()
      }
    })
  })

  it('should handle an asynchronous response intercept error gracefully', function(done){
    var error = false,
      reqInt = false,
      respInt = false,
      server = false
    roundTrip({
      error: function(err, mess){
        error = true
      },
      requestIntercept: function(req, resp){
        reqInt = true
      },
      responseIntercept: function(req, resp, next){
        respInt = true
        setTimeout(function(){
          next(new Error('fake error'))
        },0);
      },
      server: function(){
        server = true
      },
      client: function(a,b){
        assert.ok(error, 'error should have occurred')
        assert.ok(reqInt, 'request intercept should have occurred')
        assert.ok(server, 'server hit should have occurred')
        assert.ok(respInt, 'response intercept should have occurred')
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

  it('should skip the server hit if the response statusCode is populated', function(done){
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

  it('should skip the server hit if the response body is populated', function(done){
    roundTrip({
      error: function(err, mess){
        done(err)
      },
      requestIntercept: function(req, resp){
        resp.string = '12345'
      },
      server: function(){
        done(new Error('server hit was not skipped'))
      },
      client: function(){
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
        var upper = 200,
          lower = 100,
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
        var upper = 200,
          lower = 100,
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
        var upper = 2000,
          lower   = 1000,
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
        var upper = 2000,
          lower = 1000,
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
})
