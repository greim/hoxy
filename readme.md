# Overview

Hoxy is a web debugging proxy API for node.

# Installation

    npm install

then...

```javascript
var hoxy = require('hoxy');
```

# Documentation

http://greim.github.io/hoxy/

Extensive documentation can be found here.

# Note: 1.x versus 0.x

1.x is a ground-up rewrite and re-envisioning of the project.
0.x was a command line utility, whereas 1.x is a programming API.
In 0.x you controlled Hoxy using a custom rule syntax, whereas in 1.x you simply `require('hoxy')` and code in JavaScript.
The custom rule syntax made it easy for me personally to spin up various debugging proxy instances, but it was understandably a hinderance to general adoption.
Plus, as a general-purpose npm module, other projects can now build upon Hoxy's capabilities.
Hoxy 1.x is currently in an experimental state.

