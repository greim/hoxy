Rules
=====

Hoxy reads `rules.txt` upon startup. For each request, hoxy executes all rules found in it. You may edit and resave the rules file at any time without needing to restart hoxy, however saving a malformed rule will cause hoxy to print an error to the console and ignore that rule.

Rule Syntax Overview
====================

Rules must be on a single line and follow the form:

    <phase>: [<conditions>,] <actions>

Examples:

    request: if $file eq 'foo.min.js' or $file eq 'bar.min.js', @js-beautify()
    response: if $content-type eq 'application/xhtml+xml', $content-type.set-to('text/html') @banner('converted to text/html')

Actions will be executed in the given phase, if the given conditions are met. If no conditions are given, the actions will always be executed. When multiple conditions are chained using `and` or `or`, for example:

    condition1 and condition2 or condition3 and condition4

...then evaluation is left-to-right, with implied grouping like this:

    ((condition1 and condition2) or condition3) and condition4

Rule Syntax Details
===================

Phase
-----

All rules must be preceded by a phase, which can be either `request` or `response`.

Request-phase rules are processed after the client has sent the request to the proxy, but before the proxy has sent the request to the server.

Response-phase rules are processed after the response has been received from the server, but before the proxy has sent the response to the client.

Things
------

Things are the nouns of the rule syntax. They're preceded by `$`, and possibly a key if it's a dictionary variable. They include:

* `$hostname` (will not contain port)
* `$port`
* `$url` (root-relative url, plus query string if present)
* `$file` (file name from the url, such as 'foo.css')
* `$request-headers[key]` (key is all-lowercase, such as 'user-agent')
* `$cookies[key]`
* `$get-params[key]` (taken from url query string)
* `$post-params[key]` (taken from request body)
* `$method` (uppercase, as in 'GET')
* `$request-body`
* `$origin` (alias for `$request-headers['origin']`)
* `$response-headers[key]` (key is all-lowercase, such as 'content-type')
* `$content-type` (e.g. just the `text/html` part of `text/html; charset=utf-8` from content-type header)
* `$charset` (e.g. just the `utf-8` part of `text/html; charset=utf-8` from content-type header)
* `$status` (returns an integer)
* `$response-body`

Obviously, trying to invoke response info such as `$status` or `$response-headers` during the request phase will cause an error. On the other hand, request information is available during the response phase.

Conditions / Tests
----------

A condition takes the form: `<thing> [not] <test>`

If `not` is present it inverts the test.

Some tests require arguments, others don't. For example:

    # "empty" DOESN'T REQUIRE ARGUMENT
    if $origion empty, ...

    # "eq" REQUIRES ONE ARGUMENT
    if $content-type eq "http://example.com", ...

    # "among" REQUIRES MULTIPLE ARGUMENTS, BRACKETED
    if $method among ["GET","HEAD"], ...

Tests include:

* `empty`
* `eq <string> | <number>`
* `contains <string>`
* `starts-with <string>`
* `ends-with <string>`
* `matches <regexp>`
* `among <list>`

The conditional section is optional, but if it exists it must start with `if` and end with `,`. In between is a list of conditions separated by `and` or `or`.

Actions
-------

There are two kinds of actions: native actions and plugins. Native actions are simple and operate on a single thing, such as `$origin.clear()`. Plugins are potentially complex and may or may not completely alter the state of the HTTP conversation.

Native actions include:

* `clear()`
* `set-to(string)`
* `replace(string, string)`
* `prepend(string)`
* `append(string)`

Obviously, an HTTP request can't go through after you call `$hostname.clear()`, so that would throw an error, whereas `$origin.clear()` wouldn't prevent the request from working. Use context and common sense to know what is possible or not.

Plugins take the form: `@something()` where "something" is the name of a file in the plugins dir, minus the `.js` extension.

The actions section of a rule comes last and may consist of an arbitrarily long list of space-separated actions.

A Note About Cumulative Effects
-------------------------------

Supposing you had these two rules:

    request: $origin.clear()
    response: if $origin not empty, $response-headers['access-control-allow-origin'].set-to('*')

...then the second rule's conditions will never be met, since the first rule makes `$origin` always return empty.

