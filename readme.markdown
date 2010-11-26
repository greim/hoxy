Overview
========

Hoxy is a web hacking proxy for [node.js](http://nodejs.org/), intended for use by web developers. Think of it is as a [Firebug](http://getfirebug.com/), or perhaps a [Greasemonkey](http://www.greasespot.net/), for the HTTP transport layer. Hoxy however operates as a standalone proxy server, not as an add-on for any specific browser.

Getting Started
---------------

Make sure node is installed on your system. Clone this project. Then, stand in the project dir and type:

    node hoxy.js <port>

...where `<port>` is the port hoxy will listen on (optional, defaults to 8080). This will start the proxy server and print an informative message. Make a note of the port hoxy is running on, and use this information to configure your browser's proxy settings.

Meanwhile, in your text editor, open `rules/rules.txt` and edit/add rules as needed. There's no need to restart hoxy each time you save the rules file.

System Requirements
--------------------

Hoxy requires node.js to run, version 0.3 or higher. (Anecdotal evidence suggests it *may* work on earlier versions, YMMV.) Any browser can be used that can be configured to use a proxy, and that can see your hoxy instance on the network.

Architectural Overview
----------------------

A normal HTTP transaction could be illustrated like this. Time flows left-to-right. Diagonal slashes represent communication hops between client and server. Numbers represent processing steps:

    HTTP TRANSACTION
    -----------------------
    server:      2
    ------------/-\--------
    client:    1   3
    -----------------------

1. Client prepares to make a request.
2. Server processes the request and prepares a response.
3. Client processes the response.

Although they're often capable of filtering and logging, for our purposes we can say that a normal HTTP proxy represents no additional processing steps. It just passes through the data transparently. Processing steps 1-3 are thus identical to above. A proxy just introduces a slight complication to the transport layer:

    USING A PROXY SERVER
    -----------------------
    server:       2
    -------------/-\-------
    proxy:      /   \
    -----------/-----\-----
    client:   1       3
    -----------------------

Hoxy differs from a normal HTTP proxy by adding two additional processing steps, one during the request phase, another during the response phase:

    USING HOXY
    -----------------------
    server:       3
    -------------/-\-------
    hoxy:       2   4
    -----------/-----\-----
    client:   1       5
    -----------------------

Hoxy provides a simple, human-readable rule syntax allowing you to manipulate the state of the HTTP transaction during the request phase (step 2) or response phase (step 4). (See the readme file in the rules folder for more info on how to write rules.) A plugin API is also provided, allowing you to arbitrarily extend hoxy's capabilities. Plugins are invoked from within the above-mentioned rule syntax. (See the readme file in the plugins folder for more info on how to write plugins.)

As far as the client and server are concerned, however, hoxy still looks like nothing more than plain old proxy server. For example if you use hoxy to beautify obfuscated JavaScript, the client will behave exactly as if that's the way the server served it. If you switch the host from production to staging, the browser still *thinks* the file comes from production. This opens the door for all kinds of testing, debugging and prototyping (and maybe some mischief) that might not otherwise be possible. Please use hoxy responsibly.

Features
--------

* Rules allow you to conditionally manipulate any aspect of the HTTP conversation, including the ability to:
    * add/delete/modify request/response headers
    * add/delete/modify request params
    * add/delete/modify request cookies
    * alter the request hostname
    * manipulate request/response bodies (as strings, won't work on binary data)
    * alter the request url
    * alter the request method
    * alter the response status code
    * introduce latency to request/response
    * throttle request/response body transfer speed
    * beautify HTML/CSS/JS code (can make it easier to debug)
    * perform internal and external redirects
    * run other plugins
* Hoxy is extensible via a plugin API
* Hoxy comes with several out-of-the-box plugins
