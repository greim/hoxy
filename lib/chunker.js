/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

export default {

  chunksToString(chunks, encoding) {
    encoding = encoding || 'utf8'
    chunks = chunks.map(chunk => chunk.toString(encoding))
    return chunks.join('')
  },

  stringToChunks(str, encoding, chunkSize) {
    encoding = encoding || 'utf8'
    chunkSize = chunkSize || 1024
    let chunks = []
    for (let from = 0; from < str.length; from += chunkSize) {
      let to = Math.min(from + chunkSize, str.length)
      chunks.push(new Buffer(str.substring(from, to), encoding))
    }
    return chunks
  },
}
