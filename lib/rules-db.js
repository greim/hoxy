/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

var FS = require('fs');
var RULES = require('./rules.js');

var dir = './rules';
var filename = 'rules.txt';
var filepath = dir+'/'+filename;
var rules = [];
var overrideRules = false;

try {
	FS.mkdirSync(dir, 0755);
} catch(ex) { }

try {
	var stats = FS.statSync(filepath);
} catch(ex) {
	FS.writeFileSync(filepath, '', 'utf8');
	stats = FS.statSync(filepath);
}

var emt = /\S/;
var comment = /^\s*#/;
function loadRules() {
	FS.readFile(filepath, 'utf8', function(err, data){
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

loadRules();

FS.watchFile(filepath, {persistent: true, interval: 300}, loadRules);

exports.getRules = function(){return overrideRules || rules;};
exports.setRules = function(newRules){overrideRules=newRules;};//basically for testing
