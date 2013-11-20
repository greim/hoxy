# Overview

Hoxy is a web debugging proxy for web developers. Using hoxy, you can intercept requests and responses, operate on them using JavaScript, and then send them on their way. Because Hoxy behaves as a standalone proxy server, it can be used with any browser.

```javascript
var proxy = require('hoxy').start({
  port: 8080
});

proxy.intercept('request', function(req, resp){
  req.headers.cookie = undefined;
});

proxy.intercept('response', function(req, resp){
  resp.setBody('hello!', 'utf8');
});
```

## Installation

    npm install hoxy

# Architectural Overview

An HTTP conversation could be illustrated like this:

    HTTP TRANSACTION
    -----------------------
    server:      2
    ------------/-\--------
    client:    1   3
    -----------------------
    time -->

1. Client sends request.
2. Server receives request and sends response.
3. Client receives response.

From a high level, a web proxy represents no additional steps.

    USING A PROXY SERVER
    -----------------------
    server:       2
    -------------/-\-------
    proxy:      /   \
    -----------/-----\-----
    client:   1       3
    -----------------------

1. Client sends request.
2. Server receives request and sends response.
3. Client receives response.

Hoxy behaves the same way, but adds two additional checkpoints, acting as a man in the middle between client and server.

    USING HOXY
    -----------------------
    server:       3
    -------------/-\-------
    hoxy:       2   4
    -----------/-----\-----
    client:   1       5
    -----------------------

1. Client sends request.
2. Hoxy operates on request.
3. Server receives request and sends response.
4. Hoxy operates on response.
5. Client receives response.

You provide callback functions for steps 2 and 4. Within those callback functions, the entire contents of the request and response—including the body contents—are available to you as JavaScript variables.

During the request phase, the response object is *unpopulated*, but is still available as a JavaScript variable. If you populate it yourself, Hoxy will notice, and won't send the request to the server, but rather will skip directly to the response phase.

    ------------------------------
    server:  *remains ignorant*
    ------------------------------
    hoxy:          2———3
    --------------/-----\---------
    client:      1       4
    ------------------------------

1. Client sends request.
2. Hoxy operates on request (response gets populated).
3. Hoxy operates on response.
4. Client receives response.

# Staging Server Mode

Hoxy has an optional staging server mode, where in addition to functioning as a normal proxy, it can function as a reverse proxy. To start up hoxy in staging server mode:

```javascript
var proxy = require('hoxy').start({
  port: 8080,
  stage: 'http://example.com:81'
});
```
