/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import chunker from './chunker'
import BufferReader from './buffer-reader'
import DomReader from './dom-reader'
import JsonReader from './json-reader'
import StreamBrake from './stream-brake'
import cheerio from 'cheerio'
import awate from 'await'

// ---------------------------

export default {

  /*
   * Wrap an array of buffers as a readable stream.
   */
  from(buffers) {
    return new BufferReader(buffers)
  },

  dom(buffers, encoding) {
    let body = chunker.chunksToString(buffers, encoding)
    let $ = cheerio.load(body)
    return new DomReader($)
  },

  json(buffers, encoding) {
    let body = chunker.chunksToString(buffers, encoding)
    let obj = JSON.parse(body)
    return new JsonReader(obj)
  },

  /*
   * Create a transform stream that simply slows the throughput.
   */
  brake(rate, period) {
    if (!rate) {
      throw new Error('no data rate provided')
    }
    if (!period) {
      if (rate > 1000000) {
        rate = Math.round(rate / 100)
        period = 10
      } else if (rate > 100000) {
        rate = Math.round(rate / 10)
        period = 100
      } else {
        period = 1000
      }
    } else if (rate > period && period > 100000) {
      rate = Math.round(rate / 1000)
      period = Math.round(rate / 1000)
    } else if (rate > period && period > 10000) {
      rate = Math.round(rate / 100)
      period = Math.round(rate / 100)
    } else if (rate > period && period > 1000) {
      rate = Math.round(rate / 10)
      period = Math.round(rate / 10)
    }
    return new StreamBrake(rate, period)
  },

  /*
   * Get a series of buffers from a stream.
   */
  collect(readable) {
    return awate('buffers')
    .run(function(prom) {
      let buffers = []
      readable.on('error', function(err) {
        prom.fail(err)
      })
      readable.on('data', function(buffer) {
        buffers.push(buffer)
      })
      readable.on('end', function() {
        prom.keep('buffers', buffers)
      })
    })
  },

  BufferReader: BufferReader,

  DomReader: DomReader,

  JsonReader: JsonReader,
}
