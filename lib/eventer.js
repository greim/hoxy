/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var events = require('events');

// ---------------------------

// TODO: remove
module.exports = {
  extend: function(init, proto){
    var Constructor = function(){
      events.EventEmitter.call(this);
      init.apply(this, arguments);
    };
    Constructor.prototype = proto;
    Constructor.prototype.__proto__ = events.EventEmitter.prototype;
    return Constructor;
  }
};

