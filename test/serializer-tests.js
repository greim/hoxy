/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

// MOCHA TESTS
// http://visionmedia.github.com/mocha/

var assert = require('assert')
var serializer = require('../lib/serializer')

// ---------------------------

describe('Serializer', function(){

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
