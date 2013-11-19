/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var proxy = require('../hoxy').start({
  port: 8765
});

proxy.intercept('response', function(api){
  console.log('-------------------------');
  console.log('========> '+api.request.toString());
  console.log('-------------------------');
  console.log('<======== '+api.response.toString());  
});

proxy.log('info');
