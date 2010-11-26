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

* `hostname` - Hostname of destination server to which request is being made. Should be identical to the value of the "host" request header.
* `port` - Port on destination server on which to connect.
* `url` - Root-relative URL of the resource being requested.
* `filename` - By convention, all non-slash characters at the end of the request URL's path component.
* `request-headers[key]` - A dictionary object containing request header names and their values.
* `referer` - Alias for $request-headers["referer"].
* `user-agent` - Alias for $request-headers["user-agent"].
* `origin` - Alias for $request-headers["origin"].
* `cookies[key]` - A dictionary object containing cookie names and their values. Names and values are URL-decoded.
* `url-params[key]` - A dictionary object containing URL param names and their values. Names and values are URL-decoded.
* `body-params[key]` - A dictionary object containing request body names and their values. Typical with POSTs. Names and values are URL-decoded.
* `method` - Method of the request being made to the destination server. Uppercase by convention, as in GET.
* `request-body` - Request body in its entirety, represented as a string. Beware binary data.
* `response-headers[key]` - A dictionary object containing response header names and their values.
* `content-type` - Just the mime type portion of the "content-type" response-header.
* `charset` - Just the charset portion of the "content-type" response-header.
* `status` - Status code of the server response.
* `response-body` - Response body in its entirety, represented as a string. Beware binary data.

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

* `clear()` - Context determines if the thing being cleared is deleted, set to an empty string, or if an error is thrown. Use common sense.
* `set-to(string)` - Assigns a new value to something, overwriting the old value.
* `replace(stringOrRegex, string)` - Replaces all instances of the first arg by the second arg. If the first arg is a regex, match refs in the second arg will be expanded.
* `prepend(string)` - Prepends the given string to the existing value.
* `append(string)` - Appends the given string to the existing value.

Plugins take the form: `@something()` where "something" is the name of a file in the plugins dir, minus the `.js` extension.

The actions section of a rule comes last and may consist of an arbitrarily long list of space-separated actions.

A Note About Cumulative Effects
-------------------------------

Supposing you had these two rules:

    request: $origin.clear()
    response: if $origin not empty, $response-headers['access-control-allow-origin'].set-to('*')

...then the second rule's conditions will never be met, since the first rule makes `$origin` always return empty.

