/*
 Written by Greg Reimer
 Copyright (c) 2010
 http://github.com/greim
 */
var HTTP = require('http'),
  URL = require('url'),
  _ = require('lodash-node'),
  HTS = require('./lib/http-transaction-state.js'),
  Q = require('./lib/asynch-queue.js'),
  tav = require('tav'),
  stripRqHdrs = [
    'accept-encoding',
    'proxy-connection', // causes certain sites to hang
    'proxy-authorization'
  ];

// #############################################################################
// read cmd line args and declare stuff
module.exports = function (config) {
  var defaultRules = './hoxy-rules.txt';

  var opts = tav.set({
      debug: {
        note: 'Turn on debug mode, print errors to console.',
        value: false
      },
      rules: {
        note: 'Specify rules file other than default. (default ' + defaultRules + ')',
        value: defaultRules
      },
      port: {
        note: 'Specify port to listen on. (default 8080)',
        value: 8080
      },
      stage: {
        note: 'Host that ' + projectName + ' will act as a staging server for.',
        value: false
      },
      'no-version-check': {
        note: 'Attempt to run ' + projectName + ' without the startup version check.',
        value: false
      }
    },
    "Hoxy, the web-hacking proxy.\nusage: node hoxy.js [--debug] [--rules=file] [--port=port]");

  if (opts.args.length && parseInt(opts.args[0])) {
    console.error('!!! old: please use --port=something to specify port. thank you. exiting.');
    process.exit(1);
  }

  if (opts.stage && !(/^[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?$/i).test(opts.stage)) {
    console.error('error: stage must be of the form <hostname> or <hostname>:<port> exiting.');
    process.exit(1);
  }
  _.assign(opts, config);

  var proxyPort = opts.port || 8080;
  var debug = opts.debug;

  var projectName = 'Hoxy';

  var RULES = require('./lib/rules.js');
  var RDB = require('./lib/rules-db.js');

  // done
  // #############################################################################
  // environment proxy config

  var useProxy, envProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  if (useProxy = !!envProxy) {
    if (!/^http:\/\//.test(envProxy)) {
      envProxy = 'http://' + envProxy;
    }
    var pEnvProxy = URL.parse(envProxy);
    console.log('hoxy using proxy ' + envProxy);
  }

  // done
  // #############################################################################
  // error handling and subs

  // truncates a URL
  function turl(url) {
    if (url.length > 64) {
      var pUrl = URL.parse(url);
      var nurl = pUrl.protocol + '//' + pUrl.host;
      nurl += '/...' + url.substring(url.length - 10, url.length);
      url = nurl;
    }
    return url;
  }

  // debug-flag-aware error logger
  function logError(err, errType, url) {
    if (debug) {
      console.error(errType + ' error: ' + turl(url) + ': ' + err.message);
    }
  }

  return {
    init: function () {
      /*
       Requiring v0.4.x or higher because we depend on http client connection pooling.
       Also because of jsdom.
       */
      var requiredVer = [0, 4];
      var actualVer = process.version.split('.').map(function (s) {
        return parseInt(s.replace(/\D/g, ''));
      });
      if (!(function () {
        for (var i = 0; i < requiredVer.length; i++) {
          if (isNaN(actualVer[i]) || actualVer[i] < requiredVer[i]) {
            return false;
          } else if (actualVer[i] > requiredVer[i]) {
            return true;
          }
        }
        return true;
      })() && !opts['no-version-check']) {
        console.error('Error: ' + projectName + ' requires Node.js v' + requiredVer.join('.') + ' or higher but you\'re running ' + process.version);
        console.error('Use --no-version-check to attempt to run ' + projectName + ' without this check.');
        console.error('Quitting.');
        process.exit(1);
      }
    },


    // #############################################################################
    // create proxy server

    createServer: function () {
      return HTTP.createServer(function handleRequest(request, response) {

        // Handle the case where people put http://hoxy.host:port/ directly into
        // their browser's location field, rather than configuring hoxy.host:port in
        // their browser's proxy settings. In such cases, the URL won't have a
        // scheme or host. This is what staging mode is for, since it provides a
        // scheme and host in the absence of one.
        if (/^\//.test(request.url) && opts.stage) {
          request.url = 'http://' + opts.stage + request.url;
          request.headers.host = opts.stage;
        }

        // strip out certain request headers
        stripRqHdrs.forEach(function (name) {
          delete request.headers[name];
        });

        var rules = RDB.getRules();
        // grab fresh copy of rules for each request
        if(opts.ruleArray && opts.ruleArray.push) {

          rules = opts.ruleArray;
          console.log(rules);
        }

        var hts = new HTS.HttpTransactionState();
        hts.setRequest(request, function (reqInfo) {
          // entire request body is now loaded
          // process request phase rules
          var reqPhaseRulesQ = new Q.AsynchQueue();
          rules.filter(function (rule) {
            return rule.phase === 'request';
          }).forEach(function (rule) {
              reqPhaseRulesQ.push(rule.getExecuter(hts));
            });

          reqPhaseRulesQ.execute(function () {

            // request phase rules are now done processing. try to send the
            // response directly without hitting up the server for a response.
            // obviously, this will only work if the response was somehow
            // already populated, e.g. during request-phase rule processing
            // otherwise it throws an error and we send for the response.
            try {
              hts.doResponse(sendResponse);
            } catch (ex) {

              // make sure content-length jibes
              if (!reqInfo.body.length) {
                reqInfo.headers['content-length'] = 0;
              } else if (reqInfo.headers['content-length'] !== undefined) {
                var len = 0;
                reqInfo.body.forEach(function (chunk) {
                  len += chunk.length;
                });
                reqInfo.headers['content-length'] = len;
              } else { /* node will send a chunked request */
              }

              // make sure host header jibes
              if (reqInfo.headers.host) {
                reqInfo.headers.host = reqInfo.hostname;
                if (reqInfo.port !== 80) {
                  reqInfo.headers.host += ':' + reqInfo.port;
                }
              }

              // this method makes node re-use client objects if needed
              var proxyReq = HTTP.request({
                method: reqInfo.method,
                host: useProxy ? pEnvProxy.hostname : reqInfo.hostname,
                port: useProxy ? pEnvProxy.port : reqInfo.port,
                path: useProxy ? reqInfo.absUrl : reqInfo.url,
                headers: reqInfo.headers
              }, function (proxyResp) {
                hts.setResponse(proxyResp, sendResponse);
              });

              // write out to dest server
              var reqBodyQ = new Q.AsynchQueue();
              reqInfo.body.forEach(function (chunk) {
                reqBodyQ.push(function (notifier) {
                  proxyReq.write(chunk);
                  setTimeout(function () {
                    notifier.notify();
                  }, reqInfo.throttle);
                });
              });
              reqBodyQ.execute(function () {
                proxyReq.end();
              });
            }

            // same subroutine used in either case
            function sendResponse(respInfo) {

              // entire response body is now available
              // do response phase rule processing
              var respPhaseRulesQ = new Q.AsynchQueue();
              rules.filter(function (rule) {
                console.log(rule);
                return rule.phase === 'response';
              }).forEach(function (rule) {
                  respPhaseRulesQ.push(rule.getExecuter(hts));
                });

              respPhaseRulesQ.execute(function () {

                // response phase rules are now done processing
                // send response, but first drop this little hint
                // to let client know something fishy's going on
                respInfo.headers['x-manipulated-by'] = projectName;

                // shore up the content-length situation
                if (!respInfo.body.length) {
                  respInfo.headers['content-length'] = 0;
                } else if (respInfo.headers['content-length'] !== undefined) {
                  var len = 0;
                  respInfo.body.forEach(function (chunk) {
                    len += chunk.length;
                  });
                  respInfo.headers['content-length'] = len;
                } else { /* node will send a chunked response */
                }

                // write headers, queue up body writes, send, end and done
                response.writeHead(respInfo.statusCode, respInfo.headers);
                var respBodyQ = new Q.AsynchQueue();
                respInfo.body.forEach(function (chunk) {
                  respBodyQ.push(function (notifier) {
                    response.write(chunk);
                    setTimeout(function () {
                      notifier.notify();
                    }, respInfo.throttle);
                  });
                });
                respBodyQ.execute(function () {
                  response.end();
                });
              });
            }
          });
        });
      });
    },
    start: function () {

      if (!this.server) {
        this.server = this.createServer();
      }

      if(opts.rules)

      console.log(opts);

      // done creating proxy
      // #############################################################################
      // print a nice info message

      console.log('proxy running at localhost:' + opts.port);

      if (opts.stage) console.log('staging mode is on. http://localhost:' + opts.port + '/ will stage for http://' + opts.stage + '/');
      if (debug) console.log('debug mode is on.');

      // done with message
      // #############################################################################
      // start catching errors

      // helps to ensure the proxy stays up and running
      process.on('uncaughtException', function (err) {
        if (debug) {
          console.error('uncaught exception: ' + err.message);
          console.error(err.stack);
        }
      });

      this.server.listen(opts.port);
    }

  };
};