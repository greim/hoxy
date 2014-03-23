var nodemon = require('nodemon');
var pkg = require('./package.json');

// --------------------------------------------

module.exports = function(args){
  var commandOpts = './' + pkg.main + ' ' + process.argv.slice(2);
  nodemon(commandOpts);
};
