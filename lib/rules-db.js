/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

var FS = require('fs');
var PATH = require('path');
var RULES = require('./rules.js');

var opts = require('./tav.js').set();
var dir = './rules';
var filename = 'rules.txt';
var filenameExample = 'rules-example.txt';
var filepath = opts.rules || dir+'/'+filename;
var filepathExample = dir+'/'+filenameExample;
var rules = [];
var overrideRules = false;

PATH.exists(dir, function(exists){
	if (!exists) {
		console.log(dir+' does not exist, exiting.');
		process.exit(1);
	}
	PATH.exists(filepath, function(exists){
		if (!exists){
			try {
				var xmpCont = FS.readFileSync(filepathExample, 'utf8');
				FS.writeFileSync(filepath, xmpCont, 'utf8');
				console.log('copying '+filepathExample+' to '+filepath);
			} catch(err){
				console.log(err.message);
				process.exit(1);
			}
		}
		var opts = {persistent: true, interval: 500};
		FS.watchFile(filepath, opts, loadRules);
		loadRules();
	});
});

var emt = /\S/;
var comment = /^\s*#/;
function loadRules(cur, prev) {
	if (cur && (cur.mtime.getTime() === prev.mtime.getTime())) {
		return;
	}
	FS.readFile(filepath, 'utf8', function(err, data){
		if (err) { throw err; }
		rules = data.split('\n')
		.filter(function(ruleStr){
			return emt.test(ruleStr) && !comment.test(ruleStr);
		})
		.map(function(ruleStr){
			try { return new RULES.Rule(ruleStr); }
			catch (ex) {
				console.log(
					'error parsing '+filepath+': '+ex.message
					+'\nignoring entire rule, please fix'
				);
				return false;
			}
		})
		.filter(function(rule){
			return !!rule;
		});
	});
}

exports.getRules = function(){return overrideRules || rules;};
exports.setRules = function(newRules){overrideRules=newRules;};//basically for testing
