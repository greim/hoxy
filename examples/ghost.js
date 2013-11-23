/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var proxy = require('../hoxy').start({
  port: 8765,
  docroot: '/Users/greim/Pictures',
  stage: 'http://www.reddit.com'
});

// Log every request/response transaction to the console.
proxy.intercept('response', function(req, resp, done){
  this.serve({
    request: req,
    response: resp
  }, function(err){
    done(err);
  });
});

proxy.log('info');
