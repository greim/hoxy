Rules
=====

Hoxy reads `rules.txt` upon startup. For each request, hoxy executes all rules found in it. You may edit and resave the rules file at any time without needing to restart hoxy, however saving a malformed rule will cause hoxy to print an error to the console and ignore that rule.

Rule Syntax Overview
====================

Rules must be on a single line and follow the form:

    <phase>: [<conditions>,] <actions>

Examples:

    request: if $filename eq 'foo.min.js' or $filename eq 'bar.min.js', @js-beautify()
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

* `$hostname` (alias: `$host`) - Hostname of destination server to which request is being made.
* `$port` - Port on destination server on which to connect.
* `$url` - Root-relative URL of the resource being requested.
* `$filename` (alias: `$file`) - By convention, any non-slash characters at the end of the URL path.
* `$extension` (alias: `$ext`) - The filename extension matching the convention `file.ext`
* `$request-headers[key]` (alias: `$qh[key]`) - A dictionary object containing request header names and their values.
* `$referer` (alias: `$referrer`) - Shortcut for `$request-headers["referer"]`.
* `$user-agent` (alias: `$ua`) - Shortcut for `$request-headers["user-agent"]`.
* `$origin` - Shortcut for `$request-headers["origin"]`.
* `$cookies[key]` - A dictionary object containing cookie names and their values. Names and values are URL-decoded.
* `$url-params[key]` - A dictionary object containing URL param names and their values. Names and values are URL-decoded.
* `$body-params[key]` - A dictionary object containing request body names and their values. Typical with POSTs. Names and values are URL-decoded.
* `$method` - Method of the request being made to the destination server. Uppercase by convention, as in GET.
* `$request-body` - Request body in its entirety, represented as a string. Beware binary data.
* `$response-headers[key]` (alias: `$sh[key]`) - A dictionary object containing response header names and their values.
* `$content-type` (alias: `$mime-type`) - Just the mime type portion of the "content-type" response-header.
* `$charset` - Just the charset portion of the "content-type" response-header.
* `$status-code` (alias: `$status`) - Status code of the server response.
* `$response-body` (alias: `$body`) - Response body in its entirety, represented as a string. Beware binary data.

Obviously, trying to invoke response info such as `$status` or `$response-headers` during the request phase will cause an error. On the other hand, request information is available during the response phase.

Conditions / Tests
----------

A condition takes the form: `<thing> [not] <test>`

If `not` is present it inverts the test.

Some tests require arguments, others don't. For example:

    # "empty" doesn't require an argument
    $origion empty

    # "eq" requires one argument
    $content-type eq "text/html"

    # "among" requires multiple arguments, bracketed
    $method among ['GET','HEAD']
    $port among [80, 8080]

Tests include:

* `empty` - tests if the value is falsy
* `eq <string> | <number>` - tests loose equality (`==`)
* `contains <string>` - tests if the value contains the given string
* `starts-with <string>` - tests if the value starts with the given string
* `ends-with <string>` - tests if the value ends with the given string
* `matches <regexp>` - tests if the value matches the given regular expression
* `among <list>` - tests if the value loosely equals (`==`) at least one of a given list of strings or numbers
* `contains-among <list>` - tests if the value contains at least one of a given list of strings
* `matches-among <list>` - tests if the value matches at least one of a given list of regular expressions
* `lt <string> | <number>` - less than
* `lte <string> | <number>` - less that or equal to
* `gt <string> | <number>` - greater than
* `gte <string> | <number>` - greater than or equal to

The whole conditional section takes the form: `if <condition> [and|or <condition>]*,`

Note about data types: Internally, hoxy treats `$port` and `$statusCode` as numbers, not strings. For string-centric tests, such as `starts-with`, hoxy preemptively coerces the operands to strings. For others, such as `eq` and `lt`, hoxy uses JavaScript's `==` and `<` operators respectively, using operands as-is and letting JavaScript decide how to deal with coercion. For regex-centric tests, such as `matches`, hoxy will throw an error unless a regexp is provided.

Hoxy typically checks that a value exists before running a test against it that presumes existence. For example if the param "foo" doesn't exist, then `$url-params['foo'] starts-with 'abc'` would evaluate false, rather than throwing an error.

Actions
-------

Actions are the verbs of hoxy's rule syntax. There are two kinds of actions: native actions and plugins. Native actions are simple and operate on a single thing, such as `$origin.clear()`. Plugins are potentially complex and are preceded by a `@`, such as `@js-beautify()`. Empty parens are optional so `@js-beautify` works just as well.

Native actions include:

* `clear()` - Context determines if the thing being cleared is deleted, set to an empty string, or if an error is thrown. Use common sense.
* `set-to(string)` - Assigns a new value to something, overwriting the old value.
* `replace(stringOrRegex, string)` - Replaces all instances of the first arg by the second arg. If the first arg is a regex, match refs in the second arg will be expanded.
* `prepend(string)` - Prepends the given string to the existing value.
* `append(string)` - Appends the given string to the existing value.
* `log()` - Prints the value to the console.

Plugins take the form: `@something()` where "something" is the name of a file in the plugins dir, minus the `.js` extension.

The actions section of a rule comes last and may consist of an arbitrarily long list of space-separated actions:

    request: if $port not eq 80, $hostname.log @expiry(1) $url-params['foo'].set-to('bar')

A Note About Cumulative Effects
-------------------------------

Supposing you had these two rules:

    request: $origin.clear()
    response: if $origin not empty, $response-headers['access-control-allow-origin'].set-to('*')

...then the second rule's conditions will never be met, since the first rule makes `$origin` always return empty.

