/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import assert from 'assert'
import streams from '../src/streams'
import getMegaSource from './lib/megabyte-stream'

describe('Streams', function() {

  it('should have a size', function() {
    let fake = streams.from(new Buffer('x'.repeat(300), 'utf8'))
    assert.strictEqual(fake.size(), 300)
  })

  it('should output input', function(done) {
    let s = 'x'.repeat(300)
    let fake = streams.from(new Buffer(s, 'utf8'))
    let chunks = []
    fake.on('data', function(buffer) {
      chunks.push(buffer.toString('utf8'))
    })
    fake.on('end', function() {
      assert.strictEqual(chunks.join(''), s)
      done()
    })
  })

  it('should brake a big stream', function() {
    let start = Date.now()
      , fake = getMegaSource()
      , brake = streams.brake(1024 * 1000)
      , piped = fake.pipe(brake)
    return streams.collect(piped)
    .then(() => {
      let stop = Date.now()
        , diff = stop - start
      assert.ok(diff > 1000, `took ${diff}ms`)
    })
  })
})
