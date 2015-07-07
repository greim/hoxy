/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var hoxy = require('../hoxy')
var assert = require('assert')
var roundTrip = require('./lib/round-trip')

// ---------------------------

describe('Upstream', function(){

  it('should talk through an upstream proxy', function(done){
    var steps = ''
    var upstreamProxy = new hoxy.Proxy().listen(9292)
    upstreamProxy.intercept('request', function(){steps+='3'})
    upstreamProxy.intercept('response',function(){steps+='5'})
    roundTrip({
      proxyOptions: {
        upstreamProxy: 'http://localhost:9292'
      },
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
        steps += '4'
      },
      responseIntercept: function(){
        steps += '6'
      },
      responseSentIntercept: function(){
        steps += '7'
      },
      client: function(){
        assert.strictEqual(steps, '1234567')
        upstreamProxy.close()
        done()
      }
    })
  })
})
