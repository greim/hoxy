/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import BufferReader from './buffer-reader'
import { Throttle as StreamThrottle } from 'stream-throttle'
//import brake from 'brake'
//import Throttle from 'throttle'

export default {

  /*
   * Wrap an array of buffers as a readable stream.
   */
  from(buffer) {
    return new BufferReader(buffer)
  },

  /*
   * Create a transform stream that simply slows the throughput.
   */
  brake(rate) {
    return new StreamThrottle({rate: rate})
    //return brake(rate)
    //return new Throttle({ bps: rate, chunkSize: 1024, highWaterMark: 500 })
  },

  /*
   * Get a series of buffers from a stream.
   */
  collect(readable, encoding) {
    return new Promise((resolve, reject) => {
      let buffers = []
      readable.on('error', reject)
      readable.on('data', function(buffer) {
        buffers.push(buffer)
      })
      readable.on('end', function() {
        let finalBuffer = Buffer.concat(buffers)
        resolve(encoding ? finalBuffer.toString(encoding) : finalBuffer)
      })
    })
  },
}
