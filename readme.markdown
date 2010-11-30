Overview
========

Hoxy is a web hacking proxy for [node.js](http://nodejs.org/), intended for use by web developers. Think of it is as a [Firebug](http://getfirebug.com/), or perhaps a [Greasemonkey](http://www.greasespot.net/), for the HTTP transport layer. Hoxy however operates as a standalone proxy server, not as an add-on for any specific browser.

Starting Hoxy
---------------

Make sure node is installed on your system. Clone this project. Then, stand in the project dir and type:

    node hoxy.js <port>

...where `<port>` is the port hoxy will listen on (optional, defaults to 8080). This will start the proxy server and print an informative message. Make a note of the port hoxy is running on, and use this information to configure your browser's proxy settings.

Meanwhile, in your text editor, open `rules/rules.txt` and edit/add rules as needed. There's no need to restart hoxy each time you save the rules file.

How to Use Hoxy
---------------

If you have a good grasp of HTTP basics, hoxy itself isn't wildly complicated, and reading the architectural overview below should give you an idea of how it works. From there, the readme file in the `rules` dir should give you enough info to get on your way.

If you're comfortable writing JavaScript for node.js, you can also write plugins for hoxy. See the readme file in the `plugins` dir for more info.

System Requirements
--------------------

Hoxy requires node.js to run, version 0.3 or higher. (Anecdotal evidence suggests it *may* work on earlier versions, YMMV.) Any browser can be used that can be configured to use a proxy, and that can see your hoxy instance on the network.

Architectural Overview
======================

An HTTP conversation could be illustrated like this:

    HTTP TRANSACTION
    -----------------------
    server:      2
    ------------/-\--------
    client:    1   3
    -----------------------
    time -->

* Phase 1: Client prepares to make request.
* Hop: Client transmits to server.
* Phase 2: Server processes request and prepares response.
* Hop: Server transmits to client.
* Phase 3: Client processes response.

For our purposes, we can say that an HTTP proxy represents no additional processing phases. It just passes through the data transparently. A proxy just introduces a slight complication to the transport layer:

    USING A PROXY SERVER
    -----------------------
    server:       2
    -------------/-\-------
    proxy:      /   \
    -----------/-----\-----
    client:   1       3
    -----------------------

* Phase 1: Client prepares to make request.
* Hop: Client transmits to server (through the proxy).
* Phase 2: Server processes request and prepares response.
* Hop: Server transmits to client (through the proxy).
* Phase 3: Client processes response.

Hoxy differs from a normal HTTP proxy by adding two additional processing steps, one during the request phase, another during the response phase:

    USING HOXY
    -----------------------
    server:       3
    -------------/-\-------
    hoxy:       2   4
    -----------/-----\-----
    client:   1       5
    -----------------------

* Phase 1: Client prepares to make request.
* Hop: Client transmits to hoxy.
* Phase 2: Hoxy executes request-phase rules.
* Hop: Hoxy transmits to server.
* Phase 3: Server processes request and prepares response.
* Hop: Server transmits to hoxy.
* Phase 4: Hoxy executes response-phase rules.
* Hop: Hoxy transmits to client.
* Phase 5: Client processes response.

Request-phase rules (2) and response-phase rules (4) are written by you, and can change any aspect of a request or response, in a way that's undetectable by either client or server. This includes (but isn't limited to) method, url, hostname, port, status, headers, cookies, params, and even the content body.

Furthermore, a rule will fire only when certain conditions are met. For example,  *if* the url ends with ".min.js", *then* beautify the content of the response body. Or, *if* the hostname equals "www.example.com", *then* change it to "www-stage.example.com". Just as any aspect of a request or response can be altered, any aspect of a request or response can be used in a conditional.

Finally, while hoxy has a broad set of out-of-the-box capabilities, it also has a plugin API allowing developers to extend it in arbitrary ways. Plugins are written in JavaScript and invoked using the same conditional logic described above.

This opens the door for all kinds of testing, debugging and prototyping (and maybe some mischief) that might not otherwise be possible. Please use hoxy responsibly.

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
