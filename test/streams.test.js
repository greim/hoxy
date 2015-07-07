/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var await = require('await')
var fs = require('fs')
var assert = require('assert')
var streams = require('../lib/streams')
var getMegaSource = require('./lib/megabyte-stream')

// ---------------------------

describe('Streams', function(){

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
      var lower = 1000;
      var upper = 2000;
      var time = stop - start;
      assert.ok(time < upper, 'took too long, expected < '+upper+', got '+time);
      assert.ok(time > lower, 'took too short, expected > '+lower+', got '+time);
      done();
    });
  })
})
