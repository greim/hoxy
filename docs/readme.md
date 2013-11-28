# Documentation

## Main module

```javascript
var hoxy = require('hoxy');
```

Hoxy's main module provides a small number of methods. Here, we've gotten a reference to it and named it `hoxy`, although `fred` and `george` would also have been good names for it.

### `hoxy.start(opts)`

```javascript
hoxy.start({

  // port to listen on
  // optional, defaults to 8080
  port: 8080,

  // reverse proxy to this server
  // optional. won't reverse proxy if missing
  reverse: 'http://example.com:81',

  // log to stderr
  // log levels: error, warn, info, debug
  // optional. won't log anything if missing
  log: 'info'
});
```

Starts up a proxy server instance.

#### Note about `reverse`

In order to debug example.com, you'd normally start hoxy on some port (say 8080), configure your client to proxy through `localhost:8080`, and then point your client at `http://example.com/`. If you set `reverse` to `http://example.com`, you can skip the proxy configuration, point your client at `http://localhost:8080/`, and it will behave as example.com.

### `hoxy.forever([callback])`

```javascript
hoxy.forever();
```

Prevents the current process from halting due to uncaught errors, so that you don't have to keep coming back and restarting your proxy server. It logs any error stack traces to stderr for you. This is a convenience; you could just as easily call `process.on('uncaughtException', callback)` yourself.

Alternatively...

```javascript
hoxy.forever(function(err){
  // handle err however you want
});
```

## Class `Proxy`

```javascript
var proxy = hoxy.start({ port: 8080 });
```

`hoxy.start()` returns a Proxy instance which represents a running proxy server.

### `Proxy.prototype.intercept(phase, callback)`

```javascript
proxy.intercept('request', function(req, resp){
  // do stuff
});
```

Adds an intercept listener to the given phase. Multiple listeners for the same phase are executed serially, in the order added.

#### `phase`

Valid values for `phase` are:

* `request` - Hoxy has received the request, but hasn't forwarded it to the server yet.
* `sent` - Hoxy has forwarded the request to the server, but hasn't gotten a response yet.
* `response` - Hoxy has received a response from the server, but hasn't forwarded it to the client yet.
* `received` - Hoxy has forwarded the response to the client.

#### `callback`

```javascript
function(req, resp, [done]){ ... }
```

Parameters:

* `req` - An object representing the request. It provides a number of properties such as `hostname`, `method`, and `port`. Changing these will alter the behavior of the request, including the server the request is sent to. Full API detailed below.
* `resp` - An object representing the response. It provides properties such as `statusCode` and `headers`. Changing these will affect the response that the client receives. Full API detailed below.
* `done` - Declaring this in your argument list makes this intercept behave asynchronously, and you must call `done()` when you are finished. If an error occurred, call `done(err)`.
* `this` - An instance of a Transaction. One of these is created for each request/response cycle. It provides a number of methods that are useful in addition to the ones on "req" and "resp". Its full API is detailed below.

##### Synchronous intercept

```javascript
proxy.intercept('request', function(req, resp){
  return;
});

// with error
proxy.intercept('request', function(req, resp){
  throw new Error('Oops!');
});
```

##### Asynchronous intercept

```javascript
proxy.intercept('request', function(req, resp, done){
  done();
});

// with error
proxy.intercept('request', function(req, resp, done){
  done(new Error('Oops!'));
});
```

### `Proxy.prototype.close()`

Cause the proxy server to stop running.

### `Proxy.prototype.log(level)`

Cause the proxy server to log to stderr at or above the given log level. `hoxy.start({log:level})` calls this method for you.

### `Proxy.prototype.reset()`

Removes all intercept listeners.

## Class `Request`

A `Request` instance is the first argument to every intercept listener. The same instance is shared across every intercept listener, for every phase, for a given request/response cycle.

### `Request.prototype.protocol`

The protocol of this request. Includes colon, for example `'http:'`.

### `Request.prototype.hostname`

This hostname of this request. Does not include port. For example `'www.foo.com'`.

### `Request.prototype.port`

The port of this request. A positive integer.

### `Request.prototype.method`

Method of this request, all caps like `'GET'`.

### `Request.prototype.headers`

Headers for this request. Header names are all lowercase like `'content-type'`.

### `Request.prototype.url`

The URL of this request. This is a root-relative URL like `'/page.html'`.

### `Request.prototype.source`

A [readable stream](http://nodejs.org/api/stream.html#stream_class_stream_readable) object representing the entity body of this request, if one exists. Only overwrite this with another readable stream object. Doing so changes the entity body of the request.

### `Request.prototype.$`

A [cheerio](https://github.com/MatthewMueller/cheerio) instance representing the HTML entity body of this request. This object is undefined unless you've intercepted the response with the `:$` qualifier. This property exists on responses too, where it is more likely to be useful.

### `Request.prototype.json`

A POJO (plain old JavaScript object) representing the JSON entity body of this request. This object is undefined unless you've intercepted the response with the `:json` qualifier.

### `Request.prototype.data(name, [value])`

Get or set arbitrary data on this request. This is a useful way to share data across multiple intercepts, since the same `Request` instance is shared across all intercepts in all phases for a single request/response cycle.

`req.data(name)` gets a value by name, whereas `req.data(name, value)` sets the value for `name` to `value`.

### `Request.prototype.slow(options)`

Simulate a low bandwidth/high latency network connection for the request phase.

```javascript
req.slow({

  // Wait this many milliseconds before
  // forwarding this request to the server.
  // Optional; defaults to zero.
  latency: 50,

  // Limit the transfer rate of the entity body
  // to this many bytes per second. Only relevant
  // for requests with an entity body. Optional,
  // defaults to infinity (no limit).
  rate: 100000
})
```

### `Request.prototype.setBody(bodyString, encoding)`

Overwrite the entity body of this request using the given string. `encoding` is optional and defaults to `'utf8'`.

### `Request.prototype.getAbsoluteUrl()`

Returns the absolute URL of this request including protocol, hostname and port.

## Class `Response`

A `Response` instance is the second argument to every intercept listener. The same instance is shared across every intercept listener, for every phase, for a given request/response cycle.

### `Response.prototype.statusCode`

The status of this response. A positive integer.

### `Response.prototype.headers`

Headers for this response. Header names are all lowercase like `'content-type'`.

### `Response.prototype.source`

A [readable stream](http://nodejs.org/api/stream.html#stream_class_stream_readable) object representing the entity body of this response. Only overwrite this with another readable stream object. Doing so changes the entity body of the response.

### `Response.prototype.$`

A [cheerio](https://github.com/MatthewMueller/cheerio) instance representing the HTML entity body of this response. This object is undefined unless you've intercepted the response with the `:$` qualifier.

### `Response.prototype.json`

A POJO (plain old JavaScript object) representing the JSON entity body of this response. This object is undefined unless you've intercepted the response with the `:json` qualifier.

### `Response.prototype.data(name, [value])`

Get or set arbitrary data on this response. This is a useful way to share data across multiple intercepts, since the same `Response` instance is shared across all intercepts in all phases for a single request/response cycle.

`resp.data(name)` gets a value by name, whereas `resp.data(name, value)` sets the value for `name` to `value`.

### `Response.prototype.slow(options)`

Simulate a low bandwidth/high latency network connection for the response phase.

```javascript
resp.slow({

  // Wait this many milliseconds before
  // forwarding this response to the client.
  // Optional; defaults to zero.
  latency: 50,

  // Limit the transfer rate of the entity body
  // to this many bytes per second. Optional,
  // defaults to infinity (no limit).
  rate: 100000
})
```

### `Response.prototype.setBody(bodyString, encoding)`

Overwrite the entity body of this response using the given string. `encoding` is optional and defaults to `'utf8'`.

### `Response.prototype.getAbsoluteUrl()`

Returns the absolute URL of this response including protocol, hostname and port.

## Class `Transaction`

A `Transaction` instance is the implicit context parameter (`this`) for every intercept listener. The same instance is shared across every intercept listener, for every phase, for a given request/response cycle.

### `Transaction.prototype.data(name, [value])`

Get or set arbitrary data on this transaction. This is a useful way to share data across multiple intercepts, since the same `Transaction` instance is shared across all intercepts in all phases for a single request/response cycle.

`this.data(name)` gets a value by name, whereas `this.data(name, value)` sets the value for `name` to `value`.

### `Transaction.prototype.serve(docroot, [url], callback)`

Provision the response from the local disk. This effectively replaces a remote docroot with a local one. In other words, the client will see a 404 if a file isn't found locally, even if it would have been found remotely.

#### Parameters

* `docroot` - Local folder to serve from.
* `url` - (optional) File to serve. Defaults to url of the current request. Note that this URL is rooted to the docroot, not the entire filesystem.
* `callback` - Called upon completion. Passed any error that occurred.

#### Example

```javascript
proxy.intercept('request', function(req, resp, done){
  /*
   * Replace production JS with local JS so you can debug.
   * Note that you must call done() either way, since
   * this.serve() is async!
   */
  if (req.url === '/js/main.js'){
    this.serve('/Users/greim','/main.js', done);
  } else {
    done();
  }
});
```

### `Transaction.prototype.ghost(docroot, [url], callback)`

Provision the response from the local disk. Effectively overlays a local docroot over a remote one. In other words, the client won't see a 404 if a file isn't found locally. Instead, `ghost()` will fail silently and the client will see through to the remote docroot.

#### Parameters

* `docroot` - Local folder to serve from.
* `url` - (optional) File to serve. Defaults to url of the current request. Note that this URL is rooted to the docroot, not the entire filesystem.
* `callback` - Called upon completion. Passed any error that occurred.

#### Example

```javascript
proxy.intercept('request', function(req, resp, done){
  /*
   * Replace production assets with local so you can debug.
   * Note that you must call done() either way, since
   * this.serve() is async!
   */
  if (req.url === '/js/main.js'){
    this.serve('/Users/greim/repo/webapp-root', done);
  } else {
    done();
  }
});
```








