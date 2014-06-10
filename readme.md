# Hoxy

**Description**: Web-debugging proxy API for node.

**Documentation**: http://greim.github.io/hoxy/

```javascript
var hoxy = require('hoxy');

var proxy = new hoxy.Proxy();

proxy.intercept({
  phase: 'response',
  mimeType: 'text/html',
  as: '$'
}, function(req, resp){
  resp.$('title').text('Unicorns.');
});

proxy.listen(8080);

// now proxy your client through localhost:8080 
```

# Release notes:

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

# Note: 1.x vs 0.x

If you're looking for the old command line version of hoxy, it's branched as `v0.2.x` in this repository and still available on npm.
Continued updates to that branch are unlikely.

1.x is an overhaul of the project.
1.x is a programming API, whereas 0.x was a command line utility.
1.x fully passes a decently large test suite.
