/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var proxy = require('../hoxy').start({
  port: 8765
});

proxy.intercept('response', function(req, resp){
  console.log('-------------------------');
  console.log('========> '+req.toString());
  console.log('-------------------------');
  console.log('<======== '+resp.toString());  
});

proxy.log('info');
