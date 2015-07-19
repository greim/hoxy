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

  stringToChunks(str, encoding) {
    return [new Buffer(str, encoding || 'utf8')]
  },
}
