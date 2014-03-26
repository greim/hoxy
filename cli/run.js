var nodemon = require('nodemon');
var cwd = process.cwd();

// --------------------------------------------

module.exports = function(args){
  var pkg = require(cwd + '/package.json');
  var commandOpts = pkg.main + ' ' + process.argv.slice(3).join(' ');
  nodemon(commandOpts);
};
