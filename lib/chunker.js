/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

module.exports = {
  chunksToString: function(chunks, encoding){
    encoding = encoding || 'utf8';
    chunks = chunks.map(function(chunk){
      return chunk.toString(encoding);
    });
    return chunks.join('');
  },
  stringToChunks: function(str, encoding, chunkSize){
    encoding = encoding || 'utf8';
    chunkSize = chunkSize || 1024;
    var chunks = [];
    for (var from=0; from < str.length; from += chunkSize) {
      var to = Math.min(from + chunkSize, str.length);
      chunks.push(new Buffer(str.substring(from, to), encoding));
    }
    return chunks;
  }
};
