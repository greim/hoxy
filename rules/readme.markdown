Rule Syntax Overview
====================

Rules must be on a single line and follow the form:

    <phase>: [<conditions>,] <actions>

Actions will be executed in the given phase, if the given conditions are met. If no conditions are given, the actions will always be executed. When multiple conditions are chained using `and` or `or`, for example:

    condition1 and condition2 or condition3 and condition4

Evaluation is left-to-right, with implied grouping like this:

    ((condition1 and condition2) or condition3) and condition4

Rule Syntax Details
===================

Phase
-----

All rules must be preceded by a phase, which can be either `request` or `response`. Request-phase rules are processed after the client has sent the request to the proxy, but before the proxy has sent the request to the server. Response phase rules are processed after the response has been received from the server, but before the proxy has sent the response to the client.

Things
------

Things are the nouns of the rule syntax. They're preceded by `$`, and possibly a key if it's a dictionary variable. They include:

* `$hostname`
* `$port`
* `$protocol`
* `$url`
* `$file`
* `$request-headers[key]`
* `$cookies[key]`
* `$get-params[key]`
* `$post-params[key]`
* `$method`
* `$request-body`
* `$origin`
* `$response-headers[key]`
* `$content-type`
* `$charset`
* `$status`
* `$response-body`

Obviously, trying to invoke `$status` or `$response-headers` during the request phase will cause an error. However, request information is available during the response phase.

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
* `eq <string>`
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
* `replace(search`
* `replace)`
* `prepend(string)`
* `append(string)`

Plugins take the form: `@something()` where "something" is the name of a file in the plugins dir, minus the `.js` extension.

The actions section of a rule comes last and may consist of an arbitrarily long list of space-separated actions.
