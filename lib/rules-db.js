/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

var FS = require('fs');
var PATH = require('path');
var RULES = require('./rules.js');


var xmpFile = PATH.normalize(__dirname + '/../rules/rules-example.txt');

var rules = [];
var overrideRules = false;



exports.init = function(opts){

    var file = opts.rules;

    FS.exists(file, function(fileExists){
        FS.exists(xmpFile, function(xmpFileExists){
            if (!fileExists) {
                if (!xmpFileExists) {
                    console.error('error: '+file+' doesn\'t exist, exiting');
                    process.exit(1);
                } else {
                    try {
                        var xmpCont = FS.readFileSync(xmpFile, 'utf8');
                        FS.writeFileSync(file, xmpCont, 'utf8');
                        console.log('copying '+xmpFile+' to '+file);
                    } catch(err){
                        console.error(err.message);
                        process.exit(1);
                    }
                }
            }
            var opts = {persistent: true, interval: 500};
            FS.watchFile(file, opts, loadRules);
            loadRules();
        });
    });

    var emt = /\S/;
    var comment = /^\s*#/;
    function loadRules(cur, prev) {
        if (cur && (cur.mtime.getTime() === prev.mtime.getTime())) {
            return;
        }
        FS.readFile(file, 'utf8', function(err, data){
            if (err) { throw err; }
            rules = data.split('\n')
            .filter(function(ruleStr){
                return emt.test(ruleStr) && !comment.test(ruleStr);
            })
            .map(function(ruleStr){
                try { return new RULES.Rule(ruleStr); }
                catch (ex) {
                    console.error(
                        'error parsing '+file+': '+ex.message
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
}

exports.getRules = function(){return overrideRules || rules;};
exports.setRules = function(newRules){overrideRules=newRules;};//basically for testing
