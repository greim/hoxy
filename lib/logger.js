/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

function Logger(level){
  this._level = level;
}

var levels = {
  debug: 100,
  info: 200,
  warn: 300,
  error: 400
};

Logger.prototype = {
  debug: function(message){
    if (levels[this._level] <= levels.debug){
      console.error(message);
    }
  },
  info: function(message){
    if (levels[this._level] <= levels.info){
      console.error(message);
    }
  },
  warn: function(message){
    if (levels[this._level] <= levels.warn){
      console.error(message);
    }
  },
  error: function(message){
    if (levels[this._level] <= levels.error){
      console.error(message);
    }
  }
};

module.exports = Logger;
