#!/usr/bin/env node

var parseArgs = require('minimist');
var await = require('await');
var fs = require('fs');

var args = parseArgs(process.argv.slice(2), {
  default: { port: '8080' }
});

args.port = parseInt(args.port, 10);

var subcommand = args._[0];

if (subcommand === 'init'){
  require('./' + subcommand)(args);
} else if (subcommand === 'run') {
  require('./' + subcommand)(args);
} else {
  console.error('unknown subcommand ' + subcommand);
  process.exit(1);
}
