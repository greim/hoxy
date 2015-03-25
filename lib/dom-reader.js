/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var chunker = require('./chunker');
var cheerio = require('cheerio');
var util = require('util');
var Readable = require('stream').Readable;
var isTypeXml = require('./is-xml');

// ---------------------------

// TODO: test
function DomReader($, contentType){
  Readable.call(this, {});
  this._contentType = contentType;
  this._$ = $;
  this._i = 0;
  this._keepGoing = true;
}

util.inherits(DomReader, Readable);

DomReader.prototype.stringable = true;

DomReader.prototype.toString = function(){
  var isXml = isTypeXml(this._contentType);
  return this._$[isXml ? 'xml' : 'html']();
};

DomReader.prototype.finalize = function(){
  var body = this.toString();
  this._buffers = chunker.stringToChunks(body, 'utf8');
};

DomReader.prototype.setString = function(str, mimeType){
  var isXml = isTypeXml(contentType);
  this._$ = cheerio.load(str, {xmlMode:isXml});
};

DomReader.prototype._read = function(){
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

DomReader.prototype.size = function(){
  return this._buffers.reduce(function(tally, buffer){
    return tally + buffer.length;
  },0);
};

module.exports = DomReader;

function getDoctypeFromCheerio($){
  var doctype;
  $.root().contents().each(function(){
    var el = this;
    if (el && (el.name||'').toLowerCase() === '!doctype'){
      doctype = '<'+el.data+'>';
    }
  })
  return doctype;
}

function isDoctypeXhtml(doctype){
  return (/xhtml/i).test(doctype);
}
