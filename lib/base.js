/*
 * Copyright (c) 2014 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var events = require('events');

// ---------------------------

/*
 * Base utility class for making inheritance easier when prototypes have
 * getters and setters. Common methods of extending, for example
 * Object.create() or util.inherits(), broke getters/setters since they copy
 * static properties. This method avoids such copying.
 */

function Base(){}

Base.prototype.__proto__ = events.EventEmitter.prototype;

Base.extend = function(init, props, staticProps){
  var parent = this;
  var constr = function(){
    init.apply(this, arguments);
  };
  props.__proto__ = parent.prototype;
  constr.prototype = props;
  Object.keys(staticProps||{}).forEach(function(key){
    if(!constr[key]){
      constr[key] = staticProps[key];
    }
  });
  constr.extend = Base.extend;
  return constr;
}

module.exports = Base;
