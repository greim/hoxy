Plugins
=======

Plugins are a way of arbitrarily extending hoxy's capabilities.

Plugins are invoked from the rules file. See `readme.markdown` in the rules dir. If a plugin is invoked in the rules as `@foo()`, that corresponds to a file in this dir called `foo.js`.

List of OOTB Plugins
========================

* `@allow-origin()` - allows cross-origin resource sharing
* `@banner(textToShow)` - display a banner on html pages
* `@css-beautify()` - reformat css code
* `@empty-text()` - send an empty text response
* `@external-redirect(url)` - send an http redirect
* `@expiry(days, hours, mins, secs)` - send expiry headers
* `@html-beautify()` - reformat html code. [credit](http://github.com/einars/js-beautify)
* `@internal-redirect(url)` - silent redirect
* `@js-beautify()` - reformat javascrit code. [credit](http://github.com/einars/js-beautify)
* `@jquery()` - DOM-manipulate a page using jQuery before sending it along to the client. [credit](http://jquery.com/), [credit](https://github.com/tmpvar/jsdom)
* `@send-404()` - sends a 404 response
* `@throttle(ms, chunkSize)` - throttle back the transfer speed
* `@unconditional()` - suppress http conditional get headers
* `@wait(ms)` - introduce latency

For more detailed usage info for a given plugin, peruse the JS files in this dir and look at the usage info in the comments.

Plugin Authoring Guide
======================

A plugin file has the form:

	/**
	This plugin increases the temperature of the response by one kelvin.
	usage: @foo()
	*/

    // this is a plugin file
    exports.run = function(api) {
        // use the api
        // and/or do anything node.js can do
        api.notify(); // and done
    };

WARNING: after it's done executing, a plugin *must* call `api.notify()`, otherwise hoxy will hang indefinitely. This scheme allows plugins to use asynchronous logic and still be executed in order.

Plugin API Documentation
------------------------

Here are the methods exposed by the plugin `api` object shown above.

### api.arg(index)

gets any args passed to the plugin, for example if the plugin is invoked as `@foo('bar',2000)` then:

    var firstArg = api.arg(0);
    // firstArg === "bar"

    var secondArg = api.arg(1)
    // secondArg === 2000

### api.getRequestInfo()

Gets a dictionary object containing all the information hoxy will be using to make the request to the server. If the plugin is executing in the response phase, this information is purely historical and modifying it has no effect. (There are exceptions, see note about cumulative effects below.) Otherwise, modifying the properties of this object will affect the request hoxy makes to the server.

* `requestInfo.method` - HTTP method to be used.
* `requestInfo.headers` - Header dictionary.
* `requestInfo.url` - URL to be used. (must be root-relative)
* `requestInfo.hostname` - Host to make the request to.
* `requestInfo.port` - Port to make the request on.
* `requestInfo.body` - An array of buffers containing binary data. For string manipulation against the body, it's recommended to use `api.getRequestBody()` and `api.setRequestBody(string)`.
* `requestInfo.throttle` - Integer number of milliseconds to wait between writing each binary buffer in the body array out to the server.

### api.getResponseInfo()

Gets a dictionary object containing all the information hoxy will be using to return the response to the client. If the plugin is executing in the request phase, this method will return `undefined`. (There are exceptions, see note about cumulative effects below.) Otherwise, modifying the properties of this object will affect the response hoxy returns to the browser.

* `responseInfo.headers` - header dictionary.
* `responseInfo.statusCode` - status code integer.
* `responseInfo.body` - An array of buffers objects containing binary data. For string manipulation against the body, it's recommended to use `api.getResponseBody()` and `api.setResponseBody(string)`.
* `responseInfo.throttle` - Integer number of milliseconds to wait between writing each binary buffer in the body array back to the client.

### api.setRequestInfo(newInfo)

If the plugin is executing in the response phase, calling this method has no effect. (There are exceptions, see note about cumulative effects below.) Otherwise, `newInfo` replaces the existing info hoxy will use to make the request to the server. The properties of `newInfo` *must* correspond to the ones listed in the section above for `api.getRequestInfo()`.

### api.setResponseInfo(newInfo)

If the plugin is executing in the request phase, calling this method prevents hoxy from making a request to the server. Otherwise, `newInfo` overwrites the response info hoxy has already received from the server. In either case, `newInfo` will be used to return a response to the client. Its properties *must* correspond to the ones listed in the section above for `api.getResponseInfo()`.

### api.notify()

Understanding why this method is called is *critical*. By default, hoxy will hang indefinitely on the execution of each plugin until this method is called, regardless of when and how the plugin returns or errors out. One way or another, therefore, this method must be called for each plugin execution.

Furthermore, all modifications by your plugin to the request/response *must* happen before `api.notify()` is called. If modifications happen after it's called, the behavior is undefined.

### api.setResponseBody(string)

Sets the entire response body to the given string. This is a convenience method to abstract away the annoyances of operating directly on the `responseInfo.body` buffer array. (See `api.getResponseInfo()`) Note: this method should not be used on binary response bodies.

### api.setRequestBody(string)

Sets the entire request body to the given string. This is a convenience method to abstract away the annoyances of operating directly on the `requestInfo.body` buffer array. (See `api.getRequestInfo()`) Note: this method should not be used on binary request bodies.

### api.getResponseBody()

Gets the entire response body as a string. This is a convenience method to abstract away the annoyances of operating directly on the `responseInfo.body` buffer array. (See `api.getResponseInfo()`) Note: this method should not be used on binary response bodies.

### api.getRequestBody()

Gets the entire request body as a string. This is a convenience method to abstract away the annoyances of operating directly on the `requestInfo.body` buffer array. (See `api.getRequestInfo()`) Note: this method should not be used on binary request bodies.

A Note About Cumulative Effects
-------------------------------

The effects of native actions and plugins are cumulative. If one rule sets a request header, then that change will be visible to conditions, actions and plugins of subsequent rules. For example, altering request info during the response phase may affect subsequent response-phase rules whose conditionals involve request info.

For instance, the second rule below will never execute:

    request: $origin.clear()
    response: if $origin not empty, @allow-origin()

