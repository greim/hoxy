Overview
========

Hoxy is a web hacking proxy for node.js, intended for use by web developers.

Getting Started
---------------

Clone this project. Then, stand in the project dir and type:

    node hoxy.js <port>

This will start the proxy server and print an informative message. Port is optional and defaults to 8080. Make a note of the port hoxy is running on, and use this information to configure your browser's proxy settings.

Meanwhile, in your text editor, open `resources/rules-db.txt` and edit/add rules as needed. There's no need to restart hoxy each time you save the rules file.

As you're using hoxy, you may find it convenient to find a way to switch on and off your proxy settings at the click of a button, such as a browser add-on, however it's not required.

System Requirements
--------------------

Hoxy requires node.js to run, version 0.3 or higher. Any browser can be used that can be configured to use a proxy, and that can see your hoxy instance on the network.

How it Works
------------

Hoxy lets you to manipulate the HTTP conversation between your browser and the server. You can either manipulate the request as it's going out, or the response as it's coming in.

Features
--------

* Hoxy's operation is rule-driven, see comments and examples in `resources/rules-db.txt`
* Rules have simple, human-readable syntax
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
* Hoxy comes with a few out-of-the-box plugins

The Idea Behind Hoxy
====================

If you've ever been caught between *we won't know what will break until we put it into production* and *we can't put it into production until we know it won't break*, then you may like what hoxy has to offer.

If you've ever asked the age-old question *Why do all the store pages have this extra CSS file and will anything break if it goes away?* then hoxy may be for you.

If a small part of your soul dies every time you try to set a breakpoint on a YUI-compressed JS file in Firebug, then you should check out hoxy.

Hoxy exploits the fact that an HTTP proxy is transparent. Cookies, url-resolution and things like AJAX same-domain restrictions behave exactly the same whether you're going through a proxy or not, so when you load a production page through hoxy, your browser *thinks* it's looking at the production environment.

But meanwhile you may be doing anything from redirecting to the latest version of jquery, to completely re-writing the markup of an HTML page before it's sent to the browser. Or anything. Hoxy lets you test changes and debug directly against production, without the risk of actually pushing anything to production.
