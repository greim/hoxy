# Hoxy Examples

## Start Hoxy

In the rest of the examples, it's assumed this is already done.

```javascript
var proxy = require('hoxy').start({
  port: 8765
});
```

## Log every JSON request/response

```javascript
proxy.intercept('response', function(req, resp){
  if (resp.headers['content-type'] === 'application/json'){
    console.log('-------------------------');
    console.log('==> '+req.method+' '+req.url);
    console.log('<== '+resp.statusCode);
  }
});
```

## Replace CSS with a local copy

```javascript
proxy.intercept('request', function(req, resp, next){
  if (req.hostname === 'mysite.com' && req.url === '/css/main.css'){
    this.serve('/Users/greim/dev', next);
  }
});
```

## Replace production JavaScript with staged JavaScript

```javascript
proxy.intercept('request', function(req, resp, next){
  if (req.hostname === 'www.mysite.com' && /\.js$/.test(req.url)){
    req.hostname = 'www-stage.mysite.com';
  }
});
```

## Simulate a slow connection

```javascript
// upload
proxy.intercept('request', function(req, resp){
  req.slow({
    latency: 200, // milliseconds
    rate: 10000   // bytes per second
  });
});

// download
proxy.intercept('response', function(req, resp){
  resp.slow({
    latency: 50, // milliseconds
    rate: 50000  // bytes per second
  });
});
```

