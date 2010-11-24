Plugins
=======

Plugins are a way of arbitrarily extending hoxy's capabilities.

Plugins are invoked from the rules file. See `readme.markdown` in the rules dir. If a plugin is invoked in the rules as `@foo()`, that corresponds to a file in this dir called `foo.js`.

For usage info for a given plugin, peruse the JS files in this dir and look at the usage info in the comments.

Plugin Authoring Guide
======================

A plugin file has the form:

	/**
	This plugin increases the temperature of the response by one kelvin.
	usage: @foo()
	*/

    // this is a plugin file
    exports.run = function(api) {
    	...use the api...
    	...and/or do anything node.js allows you to do...
    	api.notify(); // and done
    };

WARNING: after it has done whatever it needs to do, a plugin *must* call `api.notify()`, otherwise it will cause hoxy to hang indefinitely. This scheme allows plugins to use asynchronous logic and still be executed in order.

Plugin API Documentation
------------------------

### api.arg(index)

gets any args passed to the plugin, for example if the plugin is invoked as `@foo('bar',2000)` then:

    var firstArg = api.arg(0);
    // firstArg === "bar"

    var secondArg = api.arg(1)
    // secondArg === 2000

### api.setResponseBody(string)

Sets the entire response body to the given string.

### api.setRequestBody(string)

Sets the entire request body to the given string.

### api.getResponseBody()

Gets the entire response body as a string.

### api.getRequestBody()

Gets the entire request body as a string.

### api.getRequestInfo()

Gets a dictionary object containing all the information hoxy needs to make the request to the server. If the plugin is executing in the response phase, this information is purely historical.

* `requestInfo.method` - HTTP method to be used.
* `requestInfo.headers` - Header dictionary.
* `requestInfo.url` - URL to be used. (must be root-relative)
* `requestInfo.hostname` - Host to make the request to.
* `requestInfo.port` - Port to make the request on.
* `requestInfo.body` - An array of buffer objects containing binary data. For string manipulation against the body, it's recommended to use `api.getRequestBody()` and `api.setRequestBody(string)`.
* `requestInfo.throttle` - Integer number of milliseconds to wait between writing each binary buffer in the body array out to the server.

### api.getResponseInfo()

Gets a dictionary object containing all the information hoxy needs to return the response to the client. If the plugin is executing in the request phase, this method will return `undefined`.

* `responseInfo.headers` - header dictionary.
* `responseInfo.status` - status code integer.
* `responseInfo.body` - An array of buffer objects containing binary data. For string manipulation against the body, it's recommended to use `api.getResponseBody()` and `api.setResponseBody(string)`.
* `responseInfo.throttle` - Integer number of milliseconds to wait between writing each binary buffer in the body array back to the client.

### api.setRequestInfo(newInfo)

Accepts a dictionary object. These values correspond to the ones listed in the section above for `api.getRequestInfo()`. If the plugin is executing in the request phase, these values will be used to make the request to the server.

### api.setResponseInfo(newInfo)

Accepts a dictionary object. These values correspond to the ones listed in the section above for `api.getResponseInfo()`. If called during the request phase, hoxy will not make a request to a server, and will instead use the info passed here.

### api.notify()

Must be called after the plugin is done executing.



