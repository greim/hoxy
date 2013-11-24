# Overview

Hoxy is a debugging toolkit for web developers. Using hoxy, you can intercept HTTP requests and responses, analyze and operate on them in JavaScript, and send them skipping merrily on their way. Hoxy is a standalone proxy server; so as long as you've got an proxy-capable HTTP client, Hoxy can debug it.

```javascript
var proxy = require('hoxy').start({ port: 8080 });

// Silently route requests to a different server.
// Twirl moustache and laugh villainously.
proxy.intercept('request', function(req, resp){
  if (req.hostname === 'their-server.com') {
    req.hostname = 'my-server.com';
  }
});
```

Capabilities include:

* Running as a normal web proxy or as a reverse proxy.
* Rewriting hostname, headers, ports and other details of requests and responses.
* Operating on the request/response body as a string or binary data.
* Operating on HTML pages as DOM using cheerio.
* Operating on JSON data as a JavaScript object.
* Replacing files from the destination server with ones on the local disk.
* Throttling uploads and downloads to simulate a slow connection.
* Adding latency to uploads and downloads to simulate a slow connection.

# Installation

    npm install hoxy

# Note: 1.x versus 0.x

1.x is a ground-up rewrite and re-envisioning of the project. 0.x was a command line utility, whereas 1.x is a programming API. In 0.x you controlled Hoxy using a custom rule syntax, whereas in 1.x you simply `require('hoxy')` and code in JavaScript. The custom rule syntax made it easy for me personally to spin up various debugging proxy instances, but it was understandably a hinderance to general adoption.

# How it works

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

Normally, a web proxy operates transparently, adding no additional steps.

    USING A PROXY SERVER
    -----------------------
    server:       2
    -------------/-\-------
    proxy:      /   \
    -----------/-----\-----
    client:   1       3
    -----------------------

Hoxy secretly adds two additional checkpoints, acting as a man in the middle between client and server.

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

You provide callback functions for steps 2 and/or 4. Within those, the entire contents of the request and response—including the body contents—are available to you as JavaScript variables.

During the request phase the response object is unpopulated, but is still available as a JavaScript variable. If you populate it yourself, Hoxy will notice, and won't send the request to the server, but rather will skip directly to the response phase.

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
