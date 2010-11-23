/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

/*
Throttles the writing of request and response bodies by separating them into
chunks of a given size, and imposing a delay between writing of those chunks.

usage: @throttle(delayMillis, chunkSizeInBytes=1024)
*/

function Rechunker(amt) {
	var newChunks = [];
	var newChunk = new Buffer(amt);
	var spaceRemaining = amt;
	this.put = function(chunk){
		var bytesRemaining = chunk.length;
		while (bytesRemaining > 0) {
			var targetStart = newChunk.length - spaceRemaining;
			var sourceStart = chunk.length - bytesRemaining;
			var amountToCopy = Math.min(spaceRemaining, bytesRemaining);
			chunk.copy(newChunk, targetStart, sourceStart, sourceStart + amountToCopy);
			spaceRemaining -= amountToCopy;
			bytesRemaining -= amountToCopy;
			if (spaceRemaining === 0) {
				newChunks.push(newChunk);
				newChunk = new Buffer(amt);
				spaceRemaining = amt;
			}
		}
	};
	this.getChunks = function(){
		var remainder = amt - (spaceRemaining % amt);
		if (remainder) {
			var endChunk = new Buffer(remainder);
			newChunk.copy(endChunk, 0, 0, remainder);
			newChunks.push(endChunk);
		}
		return newChunks;
	};
}

function rechunkify(oldChunks, amt){
	var rechunker = new Rechunker(amt);
	oldChunks.forEach(function(chunk){
		rechunker.put(chunk);
	});
	return rechunker.getChunks();
}

exports.run = function(api){
	var delayMS = api.arg(0);
	var chunkSizeBytes = api.arg(1) || 1024;

	api.requestInfo.throttle = delayMS;
	api.requestInfo.body = rechunkify(api.requestInfo.body, chunkSizeBytes);

	if (api.responseInfo) {
		api.responseInfo.throttle = delayMS;
		api.responseInfo.body = rechunkify(api.responseInfo.body, chunkSizeBytes);
	}
	api.notify();
};
