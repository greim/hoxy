/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var BufferReader = require('./buffer-reader');
var DomReader = require('./dom-reader');
var JsonReader = require('./json-reader');
var StreamBrake = require('./stream-brake');
var cheerio = require('cheerio');
var await = require('await');
var util = require('util');

// ---------------------------

module.exports = {
  /*
   * Wrap an array of buffers as a readable stream.
   */
  from: function(buffers){
    return new BufferReader(buffers);
  },
  dom: function(buffers, encoding){
    var body = chunker.chunksToString(buffers, encoding);
    var $ = cheerio.load(body);
    return new DomReader($);
  },
  json: function(buffers, encoding){
    var body = chunker.chunksToString(buffers, encoding);
    var obj = JSON.parse(body);
    return new JsonReader(obj);
  },
  /*
   * Create a transform stream that simply slows the throughput.
   */
  brake: function(rate, period){
    if (!rate){
      throw new Error('no data rate provided');
    }
    if (!period){
      if (rate > 1000000) {
        rate = Math.round(rate / 100);
        period = 10;
      } else if (rate > 100000) {
        rate = Math.round(rate / 10);
        period = 100;
      } else {
        period = 1000;
      }
    } else if (rate > period && period > 100000) {
      rate = Math.round(rate / 1000);
      period = Math.round(rate / 1000);
    } else if (rate > period && period > 10000) {
      rate = Math.round(rate / 100);
      period = Math.round(rate / 100);
    } else if (rate > period && period > 1000) {
      rate = Math.round(rate / 10);
      period = Math.round(rate / 10);
    }
    return new StreamBrake(rate, period);
  },
  /*
   * Get a series of buffers from a stream.
   */
  collect: function(readable){
    return await('buffers')
    .run(function(prom){
      var buffers = [];
      readable.on('error', function(err){
        prom.fail(err);
      });
      readable.on('data', function(buffer){
        buffers.push(buffer);
      });
      readable.on('end', function(){
        prom.keep('buffers', buffers);
      });
    });
  },
  BufferReader: BufferReader,
  DomReader: DomReader,
  JsonReader: JsonReader
};









