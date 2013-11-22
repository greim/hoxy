/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var Base = require('./base');
var chunker = require('./chunker');
var streams = require('./streams');
var cheerio = require('cheerio');

// ---------------------------

var Body = Base.extend(function(){},{

  /**
   * Getter/setter for readable stream object.
   */
  get source(){
    return this._data.source;
  },
  set source(readable){
    this._data.source = readable;
    this._populated = true;
  }
});

module.exports = Body;
