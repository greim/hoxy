/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

// #############################################################################
// assists in parsing

// regexp's passed to this must match against beginning of line
// and contain one parenthized match (e.g. /^(foo)/)
function Tokenizer(s) {
	chomp();
	var orig = s;
	function chomp() {
		s = s.replace(/(^\s+)|(\s+$)/g, '');
	}
	// returns an indication of where in the parsing this tokenizer is
	this.where = function(){
		var mess = 'near here:\n'
		mess += orig + '\n';
		var diff = orig.length - s.length;
		for (var i=0; i<diff; i++) {
			mess += '-';
		}
		mess += '^';
		return mess;
	};
	// removes and returns a matching string or throws error, using err
	this.require = function(patt, err){
		chomp();
		if (patt instanceof RegExp) {
			var match = s.match(patt);
			if (!match) { throw new Error(err); }
			s = s.replace(patt,'');
			chomp();
			return match[1];
		} else {
			if (s.indexOf(patt) !== 0) { throw new Error(err); }
			s = s.substring(patt.length);
			chomp();
			return patt;
		}
	};
	// removes and returns a matching string or false
	this.inquire = function(patt){
		chomp();
		if (patt instanceof RegExp) {
			var match = s.match(patt);
			if (!match) { return false; }
			s = s.replace(patt, '');
			chomp();
			return match[1];
		} else {
			if (s.indexOf(patt) !== 0) { return false; }
			s = s.substring(patt.length);
			chomp();
			return patt;
		}
	};
	// returns whether next matches, does not remove
	this.has = function(patt){
		chomp();
		if (patt instanceof RegExp) {
			return patt.test(s);
		} else {
			return s.indexOf(patt) === 0;
		}
	};
	// removes and returns next character, errs out if reaches end of string
	this.char = function(){
		if (!s) { throw new Error('unterminated literal '+this.where()); }
		var c = s.charAt(0);
		s = s.substring(1);
		return c;
	};
	this.done = function(){
		if (s) { throw new Error('scratching my head over this, '+this.where()); }
	};
}

// end tokenizer
// #############################################################################
// parser

var phasePatt = /^([a-z_][a-z0-9_-]*):/;
var thingPatt = /^(\$[a-z0-9_-]*)/;
var testOpPatt = /^((if)|(and)|(or))\b/;
var testPatt = /^([a-z_][a-z0-9_-]*)/;
var actionPatt = /^([a-z_][a-z0-9_-]*)/;
var pluginPatt = /^(@[a-z0-9_-]*)/;
var negPatt = /^(not)\b/;
var qPatt = /^(['"\/])/;
var dPatt = /^(\d+)/;

function Rule(str) {

	var tok = new Tokenizer(str);
	this.toString = function(){ return str; };
	this.tests=[];
	this.actions=[];
	var lastThing = null;

	// remove and return $foo, $foo['bar'], $foo('bar','baz') etc
	function chompThing() {
		var thing = new Thing();
		var $type = tok.require(thingPatt, 'expected thing '+tok.where());
		thing.type = $type.substring(1); // get rid of leading $
		if (thing.type === '') {
			if (!lastThing) {
				throw new Error('$ references nothing');
			}
			return lastThing;
		}
		thing.args = chompArgList();
		lastThing = thing;
		return thing;
	}

	// remove and return eval'd as js literals "foo", 'bar\t', /baz/i
	function chompLit() {
		var d = tok.inquire(dPatt);
		if (d) { return parseFloat(d); }
		var q = tok.require(qPatt, 'expected beginning of literal '+tok.where());
		var s = '', escaping = false;
		while (true) {
			var c = tok.char();
			if (c === q && !escaping) {
				var a=(q==='/')?tok.inquire(/^([a-z]*)/):'';
				try { return eval(q+s+q+a); }
				catch (ex) { throw new ex.constructor(ex.message+' '+tok.where()); }
			}
			if (escaping) { escaping = false; }
			else if (c === '\\') { escaping = true; }
			s += c;
		}
		throw new Error('unterminated literal');
	}

	// remove and return 'foo', (), ['foo'], {'foo', 'bar'} etc
	var chompArgList = (function(){
		var obPatt = /^([\(\[\{])/,
			b = {'(':')','[':']','{':'}'};
		return function() {
			var argList = [], o;
			if (o = tok.inquire(obPatt)) {
				if (tok.inquire(b[o])) { return argList; }
				do { argList.push(chompLit()); }
				while (tok.inquire(','));
				tok.require(b[o], 'expected '+b[o]+' '+tok.where());
			} else if (tok.has(qPatt) || tok.has(dPatt)) {
				argList.push(chompLit());
			}
			return argList;
		};
	})();

	// end subroutines
	// #########################################################################
	// start parsing

	// get the phase
	this.phase = tok.require(phasePatt, 'expected phase '+tok.where());

	// get tests, if any
	while (tok.has(testOpPatt)) {
		this.tests.push((function(){
			var test = {};
			test.operator = tok.require(testOpPatt,'expected operator '+tok.where());
			test.thing = chompThing();
			test.not = !!tok.inquire(negPatt);
			test.type = tok.require(testPatt,'expected test type '+tok.where());
			test.args = chompArgList();
			return test;
		})());
	}

	// require comma after tests
	if (this.tests.length) {
		tok.require(',','became angry and stopped '+tok.where());
	}

	// get actions, if any
	while (tok.has(thingPatt) || tok.has(pluginPatt)) {
		if (tok.has(thingPatt)) {
			this.actions.push((function(){
				var action = {plugin:false};
				action.thing = chompThing();
				tok.require('.','expected . '+tok.where());
				action.type = tok.require(actionPatt,'expected action type '+tok.where());
				action.args = chompArgList();
				return action;
			})());
		} else {
			this.actions.push((function(){
				var plug = {plugin:true};
				plug.type = tok.require(pluginPatt, 'parser error '+tok.where());
				plug.type = plug.type.substring(1);
				plug.args = chompArgList();
				return plug;
			})());
		}
	}

	tok.done();
	validate(this);
}

// end parser
// #############################################################################
// schema (of sorts)

// exec() method always takes string value,
// plus as many args as defined in argSpec
// exec() returns true or false
var testTypes = {
	'empty':{
		argSpec:{min:0,max:0},
		exec:function(val){
			return !val;
		}
	},
	'eq':{
		argSpec:{min:1,max:1},
		exec:function(val, str){
			return val==str;
		}
	},
	'contains':{
		argSpec:{min:1,max:1},
		exec:function(val, str){
			val = val || '';
			val = val+'', str = str+'';
			return val.indexOf(str) > -1;
		}
	},
	'starts-with':{
		argSpec:{min:1,max:1},
		exec:function(val, str){
			val = val || '';
			val = val+'', str = str+'';
			return val.indexOf(str) === 0;
		}
	},
	'ends-with':{
		argSpec:{min:1,max:1},
		exec:function(val, str){
			val = val || '';
			val = val+'', str = str+'';
			return val.indexOf(str) === val.length - str.length;
		}
	},
	'matches':{
		argSpec:{min:1,max:1},
		exec:function(val, patt){
			return patt.test(val);
		}
	},
	'among':{
		argSpec:{min:1,max:Number.POSITIVE_INFINITY},
		exec:function(val){
			for(var i=1;i<arguments.length;i++){
				if(val==arguments[i]){return true;}
			}
			return false;
		}
	},
	'contains-among':{
		argSpec:{min:1,max:Number.POSITIVE_INFINITY},
		exec:function(val){
			val = val || '';
			val = val+'';
			for(var i=1;i<arguments.length;i++){
				var str = arguments[i]+'';
				if(val.indexOf(str)>-1){return true;}
			}
			return false;
		}
	},
	'matches-among':{
		argSpec:{min:1,max:Number.POSITIVE_INFINITY},
		exec:function(val){
			for(var i=1;i<arguments.length;i++){
				if(arguments[i].test(val)){return true;}
			}
			return false;
		}
	},
	'lt':{
		argSpec:{min:1,max:1},
		exec:function(val,x){return val<x;}
	},
	'lte':{
		argSpec:{min:1,max:1},
		exec:function(val,x){return val<=x;}
	},
	'gt':{
		argSpec:{min:1,max:1},
		exec:function(val,x){return val>x;}
	},
	'gte':{
		argSpec:{min:1,max:1},
		exec:function(val,x){return val>=x;}
	},
};

// end schema
// #############################################################################
// validation

var HTS = require('./http-transaction-state.js');

function err(e) { throw new Error(e); }

function Thing(){}
Thing.prototype.validate = function(phase){
	var v = HTS.getThingValidator(this.type);
	if (!v) { err('invalid thing type: '+this.type); }
	if (!v.keyCountIs(this.args.length)) { err('wrong number of keys for '+this.type); }
	if (phase && !v.availableIn(phase)){ err('cannot access '+this.type+' from '+phase+' phase'); }
};

// throws an error on first problem encountered
function validate(rule) {
	try {
		rule.tests.forEach(function(test){

			// first check that the test is valid
			if (!(test.type in testTypes)) {
				err('invalid type: "'+test.type+'"');
			}
			if (test.args.length < testTypes[test.type].argSpec.min) {
				err(test.type+' needs more than '+test.args.length+' args');
			}
			if (test.args.length > testTypes[test.type].argSpec.max) {
				err(test.type+' needs less than '+test.args.length+' args');
			}

			// check that the thing is valid
			test.thing.validate(rule.phase);
		});

		// make sure there's an action
		if (!rule.actions.length) {
			err('no actions are defined');
		}

		rule.actions.forEach(function(action){
			if (action.plugin) { return; }
			// check action is valid
			var va = HTS.getActionValidator(action.type);
			if (!va) {
				err('invalid action: '+action.type);
			}
			if (!va.argCountIsInRange(action.args.length)) {
				err('action arg count out of range');
			}

			// check thing is valid
			action.thing.validate(rule.phase);
		});
	}catch(ex){
		throw new Error('invalid rule: '+rule.toString()+': '+ex.message);
	}
}

// end validation
// #############################################################################
// execution

var URL = require('url');
var Q = require('./asynch-queue.js');

Rule.prototype.getExecuter = function(htstate){
	var thisRule = this;
	return function(n) {
		var testsPassed = true;
		thisRule.tests.forEach(function(test, idx){

			// first, we want to get the value in question,
			// e.g. get the value of $request-headers['foo']
			var args = [test.thing.type]; // so now e.g. we'd have ['request-headers']
			args.push(test.thing.args); // and now we'd have ['request-headers', ['foo']]
			var val = htstate.get.apply(htstate, args); // htstate.get('request-headers', ['foo']) => 'bar'

			// okay so now we want to run the test
			// e.g. does $request-headers['foo'] eq 'bar'?
			args = [val]; // so this would be ['bar']
			args.push.apply(args, test.args); // and this is ['bar', 'bar']
			var tester = testTypes[test.type]; // grabs ref to the "is it equal to" test
			var thisResult = tester.exec.apply(tester, args); // which basically does tester.exec('bar', 'bar') => true

			// invert the result if this is negation
			if (test.not) { thisResult = !thisResult; }
			if (idx === 0) { testsPassed = thisResult; }
			else if (test.operator === 'or') { testsPassed |= thisResult; }
			else if (test.operator === 'and') { testsPassed &= thisResult; }
		});
		if (!testsPassed) { n.notify(); }
		else {
			var q = new Q.AsynchQueue();
			thisRule.actions.forEach(function(action){
				if (action.plugin) {
					// plugins may do i/o so we need to do asynch
					q.push(function(notifier){
						htstate.runPlugin(action.type, action.args, notifier);
					});
				} else {
					q.push(function(notifier){
						// no asynch, just immediately notify
						htstate.morph(
							action.type,
							action.args,
							action.thing.type,
							action.thing.args
						);
						notifier.notify();
					});
				}
			});
			q.execute(n.notify);
		}
	};
};

// end execution
// #############################################################################
// export

exports.Rule = Rule;

