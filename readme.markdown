Overview
========

Hoxy is a web hacking proxy for node.js, intended for use by web developers.

How it Works
------------

Hoxy lets you to manipulate the HTTP conversation between your browser and the server. Normally, an HTTP proxy is transparent—cookies, url-resolution and other origin-sensitive rules operate the same whether you're going through a proxy or not.

Hoxy capitalizes upon this fact. After the browser has sent the request to the proxy, but before the proxy has forwarded the request to the server, hoxy lets you manipulate the details of the request in arbitrary ways, such as adding or removing headers.

Likewise, after the server has returned the response to the proxy, but before the proxy has forwarded the response to the browser, hoxy lets you manipulate the details of the response in arbitrary ways, for example by running js-beautify against a response body containing minified JavaScript code.

This may come in useful in all sorts of scenarios, especially for complex production environments that are hard to debug and test against.

System Requirements
--------------------

Hoxy requires node.js to run, version 0.3 or higher. Any browser can be used that can be configured to use a proxy, and that can see hoxy over the network. Since it's a typical client/server relationship, there's no need for the browser to be running on the same machine as the server.

Features
--------

* Rule-driven operation, see resources/rules-db.txt
* Rules have simple, human-readable syntax
* Extensible via a plugin API
* Comes with several out-of-the-box plugins

Getting Started
---------------

To start hoxy, stand in the project dir and type:

    % node hoxy.js

Make a note of the port that hoxy is running on, and use this information to configure your browser's proxy settings.

Meanwhile, in your text editor, open resources/rules-db.txt and edit rules as needed. There's no need to restart hoxy each time you save the rules file.
