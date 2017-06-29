# Hoxy

An HTTP hacking tool for JavaScript programmers.

## Full Documentation

http://greim.github.io/hoxy/

## Example

```js
var hoxy = require('hoxy');
var proxy = hoxy.createServer().listen(8080);
proxy.intercept({

  // intercept during the response phase
  phase: 'response',

  // only intercept html pages
  mimeType: 'text/html',

  // expose the response body as a cheerio object
  // (cheerio is a jQuery clone)
  as: '$'
}, function(req, resp) {

  resp.$('title').text('Unicorns!');
  // all page titles will now say "Unicorns!"
});
```

## Version 3.0

Hoxy has released version 3.0.
This release simplifies the API and better supports ES6.
Notable changes:

 * A `done` callback is no longer passed as the third arg to interceptors. Interceptor arity is, accordingly, no longer a switch for async behavior. Rather, it solely depends on the return type of the interceptor (i.e. promises or iterators over promises).
 * The third argument to interceptors is now the `cycle` object, === to `this`. This was based on a suggestion from [@nerdbeere](https://github.com/nerdbeere), with a view toward supporting arrow functions, in which `this` is lexical.
 * The CLI has been completely removed from the project. The reasoning is that, by simplifying the project, I can more easily maintain it. If there's a need, it can be brought back as a separate npm module. Perhaps somebody else can take that on.
 * Undocumented `hoxy.forever()` function goes away.

## Release notes:

* **3.2.2** Merged [PR #95](https://github.com/greim/hoxy/pull/95). Thanks [devjerry](https://github.com/devjerry).
* **3.2.1** Fixed test failures regarding `content-length` and `transfer-encoding` headers.
* **3.2.0** Better error handling. Added `query` getter/setter to request.
* **3.1.3** Merged [PR #62](https://github.com/greim/hoxy/pull/62). Thanks [jonsharratt](https://github.com/jonsharratt).
* **3.1.2** Make `Proxy#log()` chainable.
* **3.1.1** Prevent `EADDRNOTAVAIL` on Windows when using `certAuthority`.
* **3.1.0** Filtering options now accept functions.
* **3.0.3** Fixed `Cycle#serve()` breakage on Windows.
* **3.0.2** Fix for a Windows EADDRNOTAVAIL error.
* **3.0.1** Fixed bug where `as` intercepts weren't catching async errors properly.
* **3.0.0** Simplify the API and better support ES6.
* **2.3.1** Back-ported 3.0.1 async `as` intercept fix.
* **2.3.0** Added getter and setter for proxy-level slow options.
* **2.2.6** Added eslint npm script. Thanks [@nerdbeere](https://github.com/nerdbeere).
* **2.2.5** Fixed a bug where `.buffer` was always undefined. Thanks [@Timwi](https://github.com/Timwi).
* **2.2.4** Added babel optional runtime transformer.
* **2.2.3** Fixed broken reference to lodash-node in CLI.
* **2.2.2** Updated hoxy version in CLI.
* **2.2.1** Fixed error in npmignore.
* **2.2.0** Added proxy-level throttling.
* **2.1.1** Ditched babel require hook and instead use compile/prepublish.
* **2.1.0** Ability to run reversy proxy as an HTTPS server. Thanks [@snoj](https://github.com/snoj).
* **2.0.0** Direct HTTPS proxying and improved async support in interceptors. Thanks [@snoj](https://github.com/snoj), [@Phoenixmatrix](https://github.com/Phoenixmatrix), [@sholladay](https://github.com/sholladay) and others for helping with the HTTPS stuff!
* **1.2.4** Improved cheerio markup serialization. Thanks [Seth Holladay](https://github.com/sholladay).
* **1.2.3** Test command now `npm test` instead of `mocha`. Proxy `close()` method now passes args through to server close. Thanks [Seth Holladay](https://github.com/sholladay).
* **1.2.2** Fixed errors and test failures occurring on io.js.
* **1.2.1** Make `listen()` accept same args as native `server.listen()` instead of just port. Thanks [Seth Holladay](https://github.com/sholladay).
* **1.2.0** Send content-length whenever reasonably possible. (minor version bump since minor alteration to existing behavior)
* **1.1.5** Default protocol to 'http:' if not found because I'm a genius.
* **1.1.4** Default protocol to 'http' if not found.
* **1.1.3** Don't munge content-length headers unless necessary.
* **1.1.2** Burned a version number because I suck at npm.
* **1.1.1** Added SSL support for requests (protocol: https).
* **1.1.0** Added CLI functionality to scaffold new proxy projects.
* **1.0.5** Fixed static conditional get fail, flexible contentType matching, ability to set fullUrl.
* **1.0.4** npm distribution no longer contains test directory.
* **1.0.3** Fixed issue #21 causing breakage on windows, due to use of unix domain sockets.
* **1.0.2** Added `tee()` method to requests and responses, and accompanying tests.
* **1.0.1** Fixed bug with URL pattern matching, added filtering tests.
* **1.0.0** Initial release of Hoxy 1.0 rewrite.
