/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var cheerio = require('cheerio');
var util = require('util');
var Readable = require('stream').Readable;

// ---------------------------

// TODO: test
function DomReader($){
  Readable.call(this, {});
  this._$ = $;
  this._i = 0;
  this._keepGoing = true;
}

util.inherits(DomReader, Readable);

DomReader.prototype.stringable = true;

DomReader.prototype.toString = function(){
  return this._$.html();
};

DomReader.prototype.setString = function(str){
  this._$ = cheerio.load(str);
};

DomReader.prototype._read = function(){
  if (!this._buffers){
    var body = this._$.html();
    this._buffers = chunker.stringToChunks(body, 'utf8');
  }
  if (this._i < this._buffers.length){
    if (this._keepGoing){
      this._keepGoing = this.push(this._buffers[this._i++]);
    } else {
      this._keepGoing = true;
    }
  } else {
    this.push(null);
  }
};

module.exports = DomReader;
