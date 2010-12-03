/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Util for serial chaining of asynchronous tasks.

usage:
var foo = new AsynchQueue();
foo.push(function(notifier){
	myAsynchCallback(function(){
		notifier.notify();
	});
});
foo.execute(function(){
	// it is finished, do stuff...
});
*/

var EVENTS = require('events');
exports.AsynchQueue = function() {
	var q = new EVENTS.EventEmitter();
	var items = [];
	var counter = -1;
	q.push = function(callback){
		var item = new AsynchQueueItem(callback);
		items.push(item);
		item.on('done',function(){
			if (++counter < items.length) {
				items[counter].execute();
			} else {
				q.emit('done');
			}
		});
		return q;
	};
	q.execute = function(cb){
		if(cb){q.on('done',cb);}
		if (!items.length) {
			q.emit('done');
			return;
		}
		counter = 0;
		items[counter].execute();
		return q;
	};
	return q;
}
var AsynchQueueItem = function(callback) {
	var itm = new EVENTS.EventEmitter();
	itm.execute = function(){
		callback({notify:function(){
			itm.emit('done');
		}});
	};
	return itm;
};
