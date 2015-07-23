# Hoxy

An HTTP hacking tool for JavaScript programmers. Document can be found here: http://greim.github.io/hoxy/

```js
import { Proxy } from 'hoxy'
let proxy = new Proxy().listen(8080)
proxy.intercept({
  phase: 'response',
  mimeType: 'text/html',
  as: '$'
}, (req, resp) => {
  resp.$('title').text('Unicorns!')
})
```

# Version 2.0

As of mid-2015 Hoxy has released version 2.0.
This release keeps a the API nearly identical to 1.x, but much of the internals are re-written.
Most notably, 2.0 contains:

 * HTTPS direct proxying.
 * In lieu of calling done(), asynchronous interceptors can return promises or iterators.
 * Refactor and simplification of internals, including streams, async logic, and unit tests.
 * Various bugfixes and performance improvements.
 
# Release notes:

* **2.2.5** Fixed a bug where `.buffers` was always undefined. Thanks [@Timwi](https://github.com/Timwi).
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
