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
var PassThrough = require('stream').PassThrough

// ---------------------------

describe('Round trips', function(){

  it('should round trip synchronously', function(done){
    roundTrip({
      error: function(err){
        done(err)
      },
      response:{
        body: 'abcdefghijklmnopqrstuvwxyz'
      },
      responseIntercept: function(req, resp){
        var pass = new PassThrough()
        var str = ''
        resp.tee(pass)
        pass.on('data', function(ch){
          str += ch
        })
        pass.on('end', function(){
          assert.strictEqual(str, 'abcdefghijklmnopqrstuvwxyz')
          done()
        })
      }
    })
  })
})
