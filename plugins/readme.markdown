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

### api.setResponseBody(string)

Sets the entire response body to the given string.

### api.setRequestBody(string)

Sets the entire request body to the given string.

### api.getResponseBody()

Gets the entire response body as a string.

### api.getRequestBody()

Gets the entire request body as a string.

### api.getRequestInfo()

Gets a dictionary object containing all the information hoxy needs to make the request to the server. If the plugin is executing in the response phase, this information is purely historical and modifying it has no effect. (There are exceptions, see note about cumulative effects below.) Otherwise, modifying the properties of this object will affect the request hoxy makes to the server.

* `requestInfo.method` - HTTP method to be used.
* `requestInfo.headers` - Header dictionary.
* `requestInfo.url` - URL to be used. (must be root-relative)
* `requestInfo.hostname` - Host to make the request to.
* `requestInfo.port` - Port to make the request on.
* `requestInfo.body` - An array of node's `Buffer` objects containing binary data. For string manipulation against the body, it's recommended to use `api.getRequestBody()` and `api.setRequestBody(string)`.
* `requestInfo.throttle` - Integer number of milliseconds to wait between writing each binary buffer in the body array out to the server.

### api.getResponseInfo()

Gets a dictionary object containing all the information hoxy needs to return the response to the client. If the plugin is executing in the request phase, this method will return `undefined`. (There are exceptions, see note about cumulative effects below.) Otherwise, modifying the properties of this object will affect the response hoxy returns to the browser.

* `responseInfo.headers` - header dictionary.
* `responseInfo.status` - status code integer.
* `responseInfo.body` - An array of node's `Buffer` objects containing binary data. For string manipulation against the body, it's recommended to use `api.getResponseBody()` and `api.setResponseBody(string)`.
* `responseInfo.throttle` - Integer number of milliseconds to wait between writing each binary buffer in the body array back to the client.

### api.setRequestInfo(newInfo)

If the plugin is executing in the response phase, calling this method has no effect. (There are exceptions, see note about cumulative effects below.) Otherwise, it deletes the existing info hoxy will use to make the request to the server, and replaces it by the given dictionary object. The values *must* correspond to the ones listed in the section above for `api.getRequestInfo()`.

### api.setResponseInfo(newInfo)

If the plugin is executing in the request phase, calling this method will prevent hoxy from making a request to the server. Otherwise, it will delete the response info received from the server. In either case, the given dictionary object's values *must* correspond to the ones listed in the section above for `api.getResponseInfo()`, and will be used to return a response to the client.

### api.notify()

Must be called after the plugin is done executing or hoxy will hang indefinitely.

A Note About Cumulative Effects
-------------------------------

The effects of native actions and plugins are cumulative. If one rule sets a request header, then that change will affect conditions, actions and plugins of subsequent rules.

