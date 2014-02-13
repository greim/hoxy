/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var await = require('await')
var fs = require('fs')
var assert = require('assert')
var roundTrip = require('./lib/round-trip')

// ---------------------------

describe('Serving from local', function(){

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
})

var files = [
  __dirname+'/files/def'
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
