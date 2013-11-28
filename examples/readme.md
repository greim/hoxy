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
proxy.intercept('response', function(req, resp){
  resp.slow({
    latency: 50, // milliseconds
    rate: 50000  // bytes per second
  });
});
```

## Manipulate response as JSON

```javascript
proxy.intercept('response:json', function(req, resp){
  // assuming response json with this structure:
  // { id: '12345' }
  resp.json.id = 'abcde'
  // client will receive this:
  // { id: 'abcde' }
});
```

## Manipulate response as DOM

```javascript
proxy.intercept('response:$', function(req, resp){
  resp.$('title').text('foo'); // change the page title to 'foo'
  resp.$('#content').addClass('test'); // add class="test" to content div
});
```

