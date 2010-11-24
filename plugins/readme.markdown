Plugins
=======

Plugins are a way of arbitrarily extending hoxy's capabilities.

Plugins are invoked from the rules file. See `readme.markdown` in rules dir.

For usage info for a given plugin, peruse the files in this dir and look at the usage info in the comments.

Plugin Authoring Guide
======================

A plugin file has the form:

    // this is a plugin file
    exports.run = function(api) {
    	...use the api...
    	...and/or do anything node.js allows you to do...
    };

WARNING: after it has done what it needs to do, a plugin *must* call `api.notify()`, otherwise it will cause hoxy to hang indefinitely. This allows plugins to behave asynchronously and still be executed in order.

Once you've saved a plugin in the plugins dir, for example `foo.js`, you can invoke it by saying `@foo()` in a rule.

API Documentation
-----------------

### `api.arg(index)`

gets any args passed to the plugin, for example if the plugin is invoked as `@foo('bar',2000)` then `api.arg(0)` will return `"bar"` and `api.arg(1)` will return `2000`.

### `api.setResponseBody(string)`

Sets the entire response body to the given string.

### `api.setRequestBody(string)`

Sets the entire request body to the given string.

### `api.getResponseBody()`

Gets the entire response body as a string.

### `api.getRequestBody()`

Gets the entire request body as a string.

### `api.setRequestInfo(newInfo)`

TODO: document

### `api.setResponseInfo(newInfo)`

TODO: document

### `api.requestInfo`

TODO: document

### `api.responseInfo`

TODO: document

### `api.notify()`

Must be called after the plugin is done executing.



