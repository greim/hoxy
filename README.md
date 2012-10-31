# Overview

Hoxy is a web-hacking proxy for [node.js](http://nodejs.org/), intended for use by web developers. Using hoxy, you can act as a "man in the middle" and alter HTTP requests and responses as they flow over the network, based on a set of conditional rules. Hoxy otherwise behaves like a standalone proxy server. Hoxy supplements debuggers like Firebug, which let you manipulate the client runtime but not the underlying HTTP conversation.

## Table of Contents

* This file: quickstart guide and arcitectural overview
* Rules readme (rules/README.md): Info on how to formulate and use rules
* Plugins readme (plugins/README.md): Info on how to create plugins

## Installation

Hoxy is availabe via npm. Install it with npm's global option to make it available in your $PATH:

    npm install -g hoxy

## Startup

npm will install the `hoxy` executable. To run it, simply type:

    hoxy

This will start hoxy on port 8080 by default. For a different port, use `--port=8081` for example. Next, configure your browser's proxy settings to point to hoxy.

If it doesn't already exist, upon startup hoxy will create a file in the `rules` dir called `rules.txt`. Open this file in your text editor and edit/add rules as needed. There's no need to restart hoxy each time you save the rules file.

Note: hoxy catches as many errors as possible in an effort to stay running. By default, error messages are suppressed. If you're writing rules or developing plugins (or developing hoxy itself), you should run in debug mode so you can see syntax or runtime errors as they occur:

    hoxy --debug

Now hoxy will dump errors to the console.

## Using Hoxy With Another Proxy

If you're sitting behind a firewall and you're forced to use a NON-transparent proxy, then configure your browser to use hoxy instead, and make sure that `HTTP_PROXY` exists in hoxy's environment, and that it identifies the proxy which you're required to use. Your browser will talk to hoxy, which will then talk to the actual proxy.

    export HTTP_PROXY=proxy.example.edu:80
    hoxy

## How to Use Hoxy

You really need a solid grasp of HTTP basics, but if you have that, the rest is easy street. Reading the architectural overview below should give you a good idea of how it works. From there, the readme file in the `rules` dir should give you enough info to get on your way writing rules.

If you're comfortable writing JavaScript for node.js, you can also write plugins for hoxy. See the readme file in the `plugins` dir for more info. Plugins let you intercept and manipulate HTTP requests programmatically, instead of limiting you to the rules syntax.

# Architectural Overview

An HTTP conversation could be illustrated like this:

    HTTP TRANSACTION
    -----------------------
    server:      2
    ------------/-\--------
    client:    1   3
    -----------------------
    time -->

* Phase 1: Client prepares to make request.
* Hop: Client transmits request to server.
* Phase 2: Server processes request and prepares response.
* Hop: Server transmits response to client.
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
* Hop: Client transmits request to server (through the proxy).
* Phase 2: Server processes request and prepares response.
* Hop: Server transmits response to client (through the proxy).
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
* Hop: Hoxy transmits (a potentially altered) request to (a potentially different) server.
* Phase 3: Server processes request and prepares response.
* Hop: Server transmits to hoxy.
* Phase 4: Hoxy executes response-phase rules.
* Hop: Hoxy transmits (a potentially altered) response to client.
* Phase 5: Client processes response.

Request-phase rules (2) and response-phase rules (4) are written by you, and can alter any aspect of a request or response, in a way that's undetectable by either client or server. This includes (but isn't limited to) method, url, hostname, port, status, headers, cookies, params, and even the content body. For example, if you change the hostname, hoxy will send the request to a *different* server, unbeknownst to the client!

Furthermore, a rule will fire only when certain conditions are met. For example, you can say, IF the url ends with ".min.js", THEN run js-beautify against the content of the response body. Or, IF the hostname equals "www.example.com", THEN change it to "www-stage.example.com". Just as any aspect of a request or response can be altered, any aspect of a request or response can be used in a conditional.

Finally, while hoxy has a broad set of out-of-the-box capabilities, its plugin API allows developers to extend it in arbitrary ways. Plugins are written in JavaScript and invoked using the same conditional logic described above. For example, IF the content type is "text/html", THEN run the foo plugin.

## A Twist in the Plot

Plugins running in the request phase have the option to write the response themselves, which effectively preempts the hit to the server. In such cases, hoxy's behavior would look like this:

    ------------------------------
    server:  *blissful ignorance*
    ------------------------------
    hoxy:          2———3
    --------------/-----\---------
    client:      1       4
    ------------------------------

* Phase 1: Client prepares to make request.
* Hop: Client transmits to hoxy.
* Phase 2: Hoxy executes request-phase rules, triggering a plugin that populates the response.
* Hoxy notices that the response has already been written and skips the server hit.
* Phase 3: Hoxy executes response-phase rules.
* Hop: Hoxy transmits to client.
* Phase 4: Client processes response.

# Staging Server Mode

Hoxy has an optional staging server mode, where in addition to functioning as a normal proxy, it can function as a reverse proxy. To start up hoxy in staging server mode:

    hoxy --port=80 --stage=www.example.com

Supposing you launched this instance of Hoxy on a machine called `dev.example.com`, you can visit `http://dev.example.com/` and it will be a mirror of `http://www.example.com/` except of course for whatever rules you're running. This is useful in testing and QA scenarios where you're testing changes on a specific website. You can then distribute test URLs to people without needing them to configure their proxy settings.
