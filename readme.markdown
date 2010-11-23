Hoxy
====

Hoxy is a web hacking proxy for node.js, intended for use by web developers.

Hoxy lets you to hack the HTTP communication layer between your browser and the server. For example, hoxy lets you:

* Add, modify and delete headers, params and cookies.
* Arbitrarily manipulate the content body.
* Silently redirect requests.
* Throttle the connection speed.
* Preview how your HTML/CSS/JS changes will behave in production.

Hoxy operates based on rules which live in a text file. Rules have a simple, human-readable syntax. Out of the box, the rules file contains no rules, so hoxy behaves like a normal HTTP proxy. Example rules are provided in the rules file comments.

TODO: document rules syntax

Hoxy is written in JavaScript and provides a plugin API, allowing web developers to write custom plugins to suit their needs.

TODO: document plugin API

Warning: Hoxy is experimental software. Rules syntax and plugin API are not finalized yet.
