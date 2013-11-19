# Hoxy

Please note, this branch is a complete rewrite of hoxy, and is not yet ready
for prime time.

Previous versions of hoxy operated primarily as a command line utility, driven
by a configuration file containing rules. This offered a way to quickly get up
and running with hoxy, but it was awkward to invoke hoxy programmatically,
requiring the use of custom plugins. With this rewrite, the core hoxy engine
becomes a programmatically-invokable object.

```javascript
// start up a proxy server on port 8080
var proxy = require('hoxy').start({
  port: 8080
});

// intercept the response and change the
// content type to application/json
proxy.intercept('response', function(api){
  api.response.contentType = 'application/json'
  api.response.encoding = 'utf-8'
});

// log basic info
proxy.log('info');
```

Command line utilities, plugin systems, rule-based traffic manipulation, and
whatever else can then be built on top of this core architecture.

## Stability

The core engine is in a pre-alpha state and may still change. All tests should
be passing.

## Tests

This rewrite also includes a less insane test suite based on mocha.
