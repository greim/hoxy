# Overview

Hoxy is a web debugging proxy API for node.

## Installation

    npm install

then...

```javascript
var hoxy = require('hoxy');
```

## Documentation

http://greim.github.io/hoxy/

Extensive documentation can be found here.

# Note: 1.x versus 0.x

If you're looking for the old command line version of hoxy, the latest and final version is tagged as 0.2.3 in this repository and still available via npm.

1.x is a ground-up rewrite and re-envisioning of the project.
0.x was a command line utility, whereas 1.x is a programming API.
0.x was installed with npm's `-g` flag, whereas 1.x is not.
In 0.x you controlled Hoxy using a configuration file containing a custom rule syntax, whereas in 1.x you simply `require('hoxy')` and code in JavaScript.
The custom rule syntax made it easy for me personally to spin up various debugging proxy instances, but it was understandably a hinderance to general adoption.
Plus, as a general-purpose npm module, other projects can now build on Hoxy's capabilities.

Hoxy 1.x is currently in an experimental state.
I'm still working on squashing bugs and getting the tests fleshed out, but as of early 2014 it is just beginning to round the corner of usability.

